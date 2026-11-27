package br.com.locarequipamentos.app;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.widget.Toast;
import androidx.appcompat.app.AlertDialog;
import androidx.browser.customtabs.CustomTabsIntent;
import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "LocarNavigation")
public class LocarNavigationPlugin extends Plugin {
    @Override
    public Boolean shouldOverrideLoad(Uri url) {
        ExternalLinkPolicy.Target target = ExternalLinkPolicy.target(url.toString(), getBridge().getServerUrl());
        if (target == ExternalLinkPolicy.Target.WHATSAPP) {
            openWhatsApp(url);
            return true;
        }
        if (target == ExternalLinkPolicy.Target.DOCUMENT) {
            openDocument(url);
            return true;
        }
        return null;
    }

    private void openWhatsApp(Uri url) {
        try {
            // Abre a conversa com texto preparado, sem enviar automaticamente.
            getActivity().startActivity(new Intent(Intent.ACTION_VIEW, url).setPackage("com.whatsapp.w4b"));
        } catch (ActivityNotFoundException e) {
            new AlertDialog.Builder(getActivity())
                .setTitle("WhatsApp Business indisponível")
                .setMessage("Não foi possível abrir o WhatsApp Business. Deseja escolher outro aplicativo para abrir a mensagem?")
                .setNegativeButton("Cancelar", null)
                .setPositiveButton("Escolher aplicativo", (dialog, which) -> {
                    try {
                        getActivity().startActivity(Intent.createChooser(new Intent(Intent.ACTION_VIEW, url), "Abrir mensagem com"));
                    } catch (ActivityNotFoundException unavailable) {
                        Toast.makeText(getContext(), "Nenhum aplicativo disponível para abrir a mensagem.", Toast.LENGTH_LONG).show();
                    }
                }).show();
        }
    }

    private void openDocument(Uri url) {
        try {
            // Fechar/Voltar retorna à WebView original, sem trocar sua URL nem recarregá-la.
            new CustomTabsIntent.Builder().setShowTitle(true).build().launchUrl(getActivity(), url);
        } catch (ActivityNotFoundException e) {
            Toast.makeText(getContext(), "Instale ou habilite um navegador para visualizar e imprimir o documento.", Toast.LENGTH_LONG).show();
        }
    }
}
