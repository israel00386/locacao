package br.com.locarequipamentos.app;

import java.net.URI;
import java.net.URISyntaxException;

/** Classifica somente os links que precisam de tratamento próprio no APK. */
final class ExternalLinkPolicy {
    enum Target { WHATSAPP, DOCUMENT, DEFAULT }

    static Target target(String value, String serverUrl) {
        try {
            URI url = new URI(value);
            if (!"https".equalsIgnoreCase(url.getScheme()) || url.getUserInfo() != null) return Target.DEFAULT;
            String host = url.getHost();
            if ("wa.me".equalsIgnoreCase(host) || "api.whatsapp.com".equalsIgnoreCase(host)) return Target.WHATSAPP;
            if (serverUrl == null) return Target.DEFAULT;
            URI server = new URI(serverUrl);
            if ("https".equalsIgnoreCase(server.getScheme()) && server.getHost() != null
                    && server.getHost().equalsIgnoreCase(host) && port(server) == port(url)
                    && url.getPath() != null && url.getPath().matches("/o/[^/]+/?")) return Target.DOCUMENT;
        } catch (URISyntaxException | IllegalArgumentException ignored) {
            // O Capacitor mantém o tratamento dos demais links.
        }
        return Target.DEFAULT;
    }

    private static int port(URI uri) { return uri.getPort() == -1 ? 443 : uri.getPort(); }
}
