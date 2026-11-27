package br.com.locarequipamentos.app;

import org.junit.Test;
import static org.junit.Assert.assertEquals;
import static br.com.locarequipamentos.app.ExternalLinkPolicy.Target.*;

public class ExternalLinkPolicyTest {
    private static final String SERVER = "https://locacao-taupe.vercel.app";
    @Test public void whatsappPreservesRecipientAndEncodedBudget() {
        assertEquals(WHATSAPP, ExternalLinkPolicy.target("https://wa.me/5585999999999?text=Or%C3%A7amento%20%26%20PDF%0Ahttps%3A%2F%2Fexample.com", SERVER));
        assertEquals(WHATSAPP, ExternalLinkPolicy.target("https://wa.me/?text=Escolher%20contato", SERVER));
        assertEquals(WHATSAPP, ExternalLinkPolicy.target("https://api.whatsapp.com/send?phone=5585999999999", SERVER));
    }
    @Test public void documentsRequireConfiguredOrigin() {
        assertEquals(DOCUMENT, ExternalLinkPolicy.target(SERVER + "/o/token?print=1#documento", SERVER));
        assertEquals(DOCUMENT, ExternalLinkPolicy.target(SERVER + ":443/o/token/", SERVER));
        assertEquals(DEFAULT, ExternalLinkPolicy.target("https://outro.example/o/token", SERVER));
        assertEquals(DEFAULT, ExternalLinkPolicy.target(SERVER + ":444/o/token", SERVER));
    }
    @Test public void internalNavigationRemainsInApp() {
        for (String path : new String[]{"/", "/locacoes/id", "/locacoes/id/editar", "/login", "/financeiro", "/o/"}) {
            assertEquals(DEFAULT, ExternalLinkPolicy.target(SERVER + path, SERVER));
        }
    }
    @Test public void doesNotTrustLookalikeHostsOrCredentials() {
        assertEquals(DEFAULT, ExternalLinkPolicy.target("https://wa.me.evil.example/5585", SERVER));
        assertEquals(DEFAULT, ExternalLinkPolicy.target("https://wa.me@evil.example/5585", SERVER));
        assertEquals(DEFAULT, ExternalLinkPolicy.target("https://user@wa.me/5585", SERVER));
        assertEquals(DEFAULT, ExternalLinkPolicy.target(SERVER + ".evil.example/o/token", SERVER));
    }
    @Test public void malformedOrNonHttpsLinksUseDefaultHandler() {
        for (String url : new String[]{"javascript:alert(1)", "http://wa.me/5585", "not a URL", "/o/token", "intent://send", ""}) {
            assertEquals(DEFAULT, ExternalLinkPolicy.target(url, SERVER));
        }
        assertEquals(DEFAULT, ExternalLinkPolicy.target(SERVER + "/o/token", null));
    }
}
