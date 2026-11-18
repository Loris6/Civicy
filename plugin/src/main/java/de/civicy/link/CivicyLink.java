package de.civicy.link;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.plugin.java.JavaPlugin;

/**
 * Civicy Link – verbindet den Minecraft-Server mit der Civicy-Webseite.
 *
 * /weblogin          holt beim Backend einen 6-stelligen Code, mit dem sich der Spieler auf der Webseite anmeldet
 *                    (echter Name, UUID und Skin – ohne Microsoft-Freigabe von Mojang).
 * Rang-Abgleich      beim Betreten wird der höchste Rang (über Permissions, z. B. aus LuckPerms) an die Webseite geschickt.
 * /civicylink reload Konfiguration neu laden · /civicylink sync [Spieler] Rang sofort abgleichen
 */
public final class CivicyLink extends JavaPlugin implements Listener {

    private static final Pattern CODE = Pattern.compile("\"code\"\\s*:\\s*\"(\\d{6})\"");

    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build();
    private final Map<UUID, Long> cooldown = new ConcurrentHashMap<>();
    private final Map<UUID, String> lastRank = new ConcurrentHashMap<>();

    @Override
    public void onEnable() {
        saveDefaultConfig();
        getServer().getPluginManager().registerEvents(this, this);
        if (!configured()) getLogger().warning("api und server-key in der config.yml eintragen, sonst funktionieren /weblogin und der Rang-Abgleich nicht.");
    }

    private boolean configured() {
        String api = getConfig().getString("api", "");
        return !api.isBlank() && !api.contains("NAME") && !getConfig().getString("server-key", "").isBlank();
    }

    private String api() { return getConfig().getString("api", "").replaceAll("/+$", ""); }

    private String msg(String key) {
        return ChatColor.translateAlternateColorCodes('&', getConfig().getString("messages." + key, key));
    }

    private HttpRequest.Builder request(String path) {
        return HttpRequest.newBuilder(URI.create(api() + path))
                .timeout(Duration.ofSeconds(10))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + getConfig().getString("server-key", ""));
    }

    private static String json(String s) {
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        String name = command.getName().toLowerCase();
        if (name.equals("weblogin")) return weblogin(sender);
        if (name.equals("civicylink")) {
            if (args.length > 0 && args[0].equalsIgnoreCase("reload")) {
                reloadConfig();
                lastRank.clear();
                sender.sendMessage(ChatColor.AQUA + "CivicyLink neu geladen.");
                return true;
            }
            if (args.length > 0 && args[0].equalsIgnoreCase("sync")) {
                Player target = args.length > 1 ? Bukkit.getPlayerExact(args[1]) : (sender instanceof Player p ? p : null);
                if (target == null) { sender.sendMessage(ChatColor.RED + "Spieler nicht gefunden."); return true; }
                lastRank.remove(target.getUniqueId());
                syncRank(target);
                sender.sendMessage(ChatColor.AQUA + "Rang von " + target.getName() + " wird abgeglichen: " + rankOf(target));
                return true;
            }
            return false;
        }
        return false;
    }

    private boolean weblogin(CommandSender sender) {
        if (!(sender instanceof Player player)) { sender.sendMessage("Nur im Spiel möglich."); return true; }
        if (!configured()) { player.sendMessage(msg("not-configured")); return true; }
        long now = System.currentTimeMillis();
        Long last = cooldown.get(player.getUniqueId());
        if (last != null && now - last < 10_000) { player.sendMessage(msg("wait")); return true; }
        cooldown.put(player.getUniqueId(), now);
        UUID uuid = player.getUniqueId();
        String body = "{\"uuid\":" + json(uuid.toString()) + ",\"name\":" + json(player.getName()) + "}";
        http.sendAsync(request("/api/link").POST(HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.ofString())
                .whenComplete((res, err) -> Bukkit.getScheduler().runTask(this, () -> {
                    Player p = Bukkit.getPlayer(uuid);
                    if (p == null) return;
                    Matcher m = res != null && res.statusCode() == 200 ? CODE.matcher(res.body()) : null;
                    if (m == null || !m.find()) {
                        p.sendMessage(msg("error"));
                        if (res != null) getLogger().warning("/api/link antwortet mit " + res.statusCode() + ": " + res.body());
                        else if (err != null) getLogger().warning("/api/link nicht erreichbar: " + err.getMessage());
                        return;
                    }
                    String code = m.group(1);
                    p.sendMessage(msg("code")
                            .replace("%code%", code.substring(0, 3) + " " + code.substring(3))
                            .replace("%website%", getConfig().getString("website", "")));
                }));
        return true;
    }

    @EventHandler
    public void onJoin(PlayerJoinEvent event) {
        Player player = event.getPlayer();
        // kurz warten, bis Permission-Plugins (z. B. LuckPerms) die Gruppen geladen haben
        Bukkit.getScheduler().runTaskLater(this, () -> { if (player.isOnline()) syncRank(player); }, 40L);
    }

    private String rankOf(Player player) {
        ConfigurationSection ranks = getConfig().getConfigurationSection("rank-sync.ranks");
        if (ranks != null) {
            for (String rank : ranks.getKeys(false)) {
                String perm = ranks.getString(rank, "");
                if (!perm.isBlank() && player.hasPermission(perm)) return rank;
            }
        }
        return getConfig().getString("rank-sync.default", "spieler");
    }

    private void syncRank(Player player) {
        if (!configured() || !getConfig().getBoolean("rank-sync.enabled", true)) return;
        String rank = rankOf(player);
        UUID uuid = player.getUniqueId();
        if (rank.equals(lastRank.get(uuid))) return;
        String body = "{\"rank\":" + json(rank) + ",\"name\":" + json(player.getName()) + "}";
        http.sendAsync(request("/api/ranks/" + uuid).PUT(HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.ofString())
                .whenComplete((res, err) -> {
                    if (res != null && res.statusCode() == 200) lastRank.put(uuid, rank);
                    else getLogger().warning("Rang für " + player.getName() + " nicht abgeglichen: " + (res != null ? res.statusCode() + " " + res.body() : String.valueOf(err)));
                });
    }
}
