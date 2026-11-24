"use client";
import { useEffect, useState } from "react";
import { Logo } from "./logo";

const MIN_MS = 1200;
const MAX_MS = 3000;

/**
 * Tela de abertura. É renderizada no HTML do servidor (root layout), então aparece antes de qualquer conteúdo.
 * O script em <head> (SPLASH_SCRIPT) marca <html class="splash-skip"> quando ela já foi vista nesta sessão,
 * escondendo-a antes da primeira pintura. Aqui só decidimos quando sair (fade) e desmontar.
 */
export function Splash() {
  const [phase, setPhase] = useState<"show" | "leaving" | "gone">("show");

  useEffect(() => {
    if (document.documentElement.classList.contains("splash-skip")) {
      setPhase("gone");
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const min = reduce ? 300 : MIN_MS;
    let done = false;
    const timers: number[] = [];
    const leave = () => {
      if (done) return;
      done = true;
      setPhase("leaving");
      timers.push(window.setTimeout(() => setPhase("gone"), 500));
    };
    // performance.now() = ms desde o início da navegação: o mínimo e o máximo contam da abertura da página.
    const ready = () => timers.push(window.setTimeout(leave, Math.max(0, min - performance.now())));
    if (document.readyState === "complete") ready();
    else window.addEventListener("load", ready, { once: true });
    timers.push(window.setTimeout(leave, Math.max(0, MAX_MS - performance.now())));
    return () => {
      window.removeEventListener("load", ready);
      timers.forEach(clearTimeout);
    };
  }, []);

  if (phase === "gone") return null;
  return (
    <div id="splash" className={phase === "leaving" ? "is-leaving" : undefined} role="status" aria-label="Carregando LOCAR Equipamentos">
      <Logo variant="stacked" markClassName="" />
      <div className="splash-dots" aria-hidden>
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

/** Roda no <head> antes da pintura: só mostra o splash na primeira abertura da sessão (e nunca no link público do orçamento). */
export const SPLASH_SCRIPT = `(function(){var d=document.documentElement;try{if(location.pathname.indexOf('/o/')===0||sessionStorage.getItem('locar-splash')){d.classList.add('splash-skip')}else{sessionStorage.setItem('locar-splash','1')}}catch(e){}})();`;
