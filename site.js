/* =====================================================================
   Mestrali: comportamento da página de apresentação.

   Sem bibliotecas. O que este arquivo faz:
     1. revela os blocos quando chegam à tela;
     2. conta os números (R$ 480,00, 67,6%) de zero até o valor;
     3. controla o vídeo (toca quando aparece, pausa quando some);
     4. mostra o botão fixo do celular entre a abertura e o fim da página;
     5. a cada rolagem: barrinha de progresso, passo atual da folha e a
        abertura do azul no fim da página.

   Se algo der errado aqui, a classe "js" é retirada do <html> e a página
   aparece inteira, parada (veja o "catch" no fim).
   ===================================================================== */

(function () {
  "use strict";

  var raiz = document.documentElement;
  var menosMovimento = window.matchMedia("(prefers-reduced-motion: reduce)");

  function limitar(valor, minimo, maximo) {
    return Math.min(maximo, Math.max(minimo, valor));
  }

  try {
    // ---------- 1. Revelar ao rolar ----------
    var paraRevelar = document.querySelectorAll(".revelar");
    if ("IntersectionObserver" in window) {
      var vigia = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (entrada) {
          if (entrada.isIntersecting) {
            entrada.target.classList.add("visivel");
            vigia.unobserve(entrada.target);       // revela uma vez só
          }
        });
      }, { rootMargin: "0px 0px -10% 0px", threshold: 0.1 });
      paraRevelar.forEach(function (el) { vigia.observe(el); });
    } else {
      paraRevelar.forEach(function (el) { el.classList.add("visivel"); });
    }

    // ---------- 2. Números que contam ----------
    function formatar(valor, casas) {
      return valor.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
    }

    // Leva o texto de "el" de 0 até "ate" em "duracao" ms, desacelerando no fim.
    function contar(el, ate, casas, duracao) {
      if (menosMovimento.matches) { el.textContent = formatar(ate, casas); return; }
      var inicio = null;
      function quadro(agora) {
        if (inicio === null) inicio = agora;
        var t = limitar((agora - inicio) / duracao, 0, 1);
        var suave = 1 - Math.pow(1 - t, 3);
        el.textContent = formatar(ate * suave, casas);
        if (t < 1) requestAnimationFrame(quadro);
      }
      requestAnimationFrame(quadro);
      // Garantia: se o navegador segurar a animação (aba em segundo plano), o valor final entra assim mesmo.
      setTimeout(function () { el.textContent = formatar(ate, casas); }, duracao + 120);
    }

    var resumo = document.getElementById("lucro-resumo");
    if (resumo && "IntersectionObserver" in window) {
      var vigiaNumeros = new IntersectionObserver(function (entradas) {
        if (!entradas[0].isIntersecting) return;
        resumo.querySelectorAll(".contar").forEach(function (el) {
          contar(el, parseFloat(el.dataset.ate), parseInt(el.dataset.casas, 10), 1200);
        });
        vigiaNumeros.disconnect();
      }, { threshold: 0.35 });
      vigiaNumeros.observe(resumo);
    }

    // ---------- 2b. A profissão que troca na abertura ----------
    var gira = document.getElementById("gira");
    var profissoes = ["técnicos de ar-condicionado", "eletricistas", "encanadores", "instaladores de câmeras", "técnicos de linha branca", "mecânicos de bikes elétricas"];
    if (gira && !menosMovimento.matches) {
      var qual = 0;
      setInterval(function () {
        if (document.hidden) return;                    // aba em segundo plano: não troca à toa
        var atual = gira.querySelector("b");
        atual.classList.add("sai");
        setTimeout(function () {
          qual = (qual + 1) % profissoes.length;
          atual.textContent = profissoes[qual];
          atual.classList.remove("sai");
          atual.classList.remove("entra-palavra");
          void atual.offsetWidth;                       // reinicia a animação de entrada
          atual.classList.add("entra-palavra");
        }, 230);
      }, 2600);
    }

    // ---------- 2c. Áreas: trocar de ofício refaz o catálogo e o orçamento de exemplo ----------
    var areas = window.MESTRALI_AREAS;
    var abas = document.querySelectorAll(".aba");
    var painel = document.getElementById("areas-painel");
    if (areas && abas.length && painel) {
      var elServicos = document.getElementById("fichas-servicos");
      var elPecas = document.getElementById("fichas-pecas");
      var elLinhas = document.getElementById("orc-linhas");

      // Cria os elementos um a um (nada de montar HTML com texto: é o jeito seguro).
      function preencher(lista, itens, comoLinha) {
        lista.textContent = "";
        itens.forEach(function (item, i) {
          var el = document.createElement(comoLinha ? "div" : "li");
          if (comoLinha) el.className = "orc-linha";
          el.style.setProperty("--i", i);
          var nome = document.createElement("span");
          nome.textContent = item[0];
          var valor = document.createElement(comoLinha ? "span" : "b");
          valor.textContent = item[1];
          el.appendChild(nome);
          el.appendChild(valor);
          lista.appendChild(el);
        });
      }

      function mostrarArea(chave, comFoco) {
        var area = areas[chave];
        if (!area) return;
        abas.forEach(function (aba) {
          var ativa = aba.dataset.area === chave;
          aba.classList.toggle("ativa", ativa);
          aba.setAttribute("aria-selected", ativa ? "true" : "false");
          aba.tabIndex = ativa ? 0 : -1;
          if (ativa) {
            painel.setAttribute("aria-labelledby", aba.id);
            if (comFoco) aba.focus();
            if (aba.scrollIntoView) aba.scrollIntoView({ block: "nearest", inline: "center", behavior: menosMovimento.matches ? "auto" : "smooth" });
          }
        });
        preencher(elServicos, area.servicos, false);
        preencher(elPecas, area.pecas, false);
        preencher(elLinhas, area.orc, true);
        document.getElementById("orc-equip").textContent = area.equip;
        contar(document.getElementById("orc-total"), area.total, 2, 700);
        contar(document.getElementById("orc-lucro"), area.lucro, 2, 900);
        contar(document.getElementById("orc-margem"), area.margem, 1, 900);
        painel.classList.remove("trocando");
        void painel.offsetWidth;                        // reinicia as animações de entrada
        painel.classList.add("trocando");
      }

      abas.forEach(function (aba, i) {
        aba.addEventListener("click", function () { mostrarArea(aba.dataset.area, false); });
        // Setas do teclado andam entre as abas, como em qualquer grupo de abas.
        aba.addEventListener("keydown", function (evento) {
          var passo = evento.key === "ArrowRight" ? 1 : evento.key === "ArrowLeft" ? -1 : 0;
          if (!passo) return;
          evento.preventDefault();
          mostrarArea(abas[(i + passo + abas.length) % abas.length].dataset.area, true);
        });
      });
    }

    // ---------- 3. Vídeo ----------
    var video = document.getElementById("video");
    var botaoVideo = document.getElementById("video-botao");
    if (video && botaoVideo) {
      var pausadoPelaPessoa = false;
      video.removeAttribute("controls");            // os controles do navegador saem; entra o nosso botão
      botaoVideo.hidden = false;

      function mostrarEstado() {
        var tocando = !video.paused;
        botaoVideo.classList.toggle("tocando", tocando);
        botaoVideo.setAttribute("aria-label", tocando ? "Pausar o vídeo" : "Tocar o vídeo");
      }
      function tocar() {
        var promessa = video.play();
        if (promessa && promessa.catch) promessa.catch(function () { /* o navegador recusou tocar sozinho */ });
      }
      function alternar() {
        if (video.paused) { pausadoPelaPessoa = false; tocar(); }
        else { pausadoPelaPessoa = true; video.pause(); }
      }
      botaoVideo.addEventListener("click", alternar);
      video.addEventListener("click", alternar);
      video.addEventListener("play", mostrarEstado);
      video.addEventListener("pause", mostrarEstado);

      // Toca sozinho só enquanto está na tela, e nunca para quem pediu menos movimento.
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entradas) {
          if (entradas[0].isIntersecting) {
            if (!pausadoPelaPessoa && !menosMovimento.matches) tocar();
          } else {
            video.pause();
          }
        }, { threshold: 0.5 }).observe(video);
      }
      mostrarEstado();

      // Som: o vídeo começa mudo; o botão liga e desliga (só responde a um toque da pessoa).
      var botaoSom = document.getElementById("video-som");
      if (botaoSom) {
        botaoSom.hidden = false;
        botaoSom.addEventListener("click", function () {
          video.muted = !video.muted;
          var ligado = !video.muted;
          botaoSom.classList.toggle("ligado", ligado);
          botaoSom.setAttribute("aria-pressed", ligado ? "true" : "false");
          botaoSom.setAttribute("aria-label", ligado ? "Desligar o som" : "Ligar o som");
          if (ligado && video.paused) { pausadoPelaPessoa = false; tocar(); }
        });
      }
    }

    // ---------- 4. Botão que acompanha a rolagem (celular) ----------
    // Aparece quando o botão da abertura saiu da tela e some quando o do fim da página chega.
    var barraFixa = document.getElementById("barra-fixa");
    var acoes = document.getElementById("acoes");
    var fim = document.getElementById("fecho");
    if (barraFixa && acoes && fim && "IntersectionObserver" in window) {
      var naTela = { acoes: true, fecho: false };
      var vigiaBotoes = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (entrada) { naTela[entrada.target.id] = entrada.isIntersecting; });
        barraFixa.classList.toggle("mostra", !naTela.acoes && !naTela.fecho);
      });
      vigiaBotoes.observe(acoes);
      vigiaBotoes.observe(fim);
    }

    // ---------- 5. O que muda a cada rolagem ----------
    var topo = document.getElementById("topo");
    var progresso = document.getElementById("progresso");
    var palco = document.getElementById("palco");
    var marcas = document.querySelectorAll("#palco-marcas span");
    var passos = document.querySelectorAll("#passos-lista li");
    var pecas = palco ? palco.querySelectorAll("[data-desde]") : [];
    var totalDaFolha = document.getElementById("total-folha");
    var fecho = document.getElementById("fecho");
    var telaEstreita = window.matchMedia("(max-width: 899px)");
    var passoMostrado = -1;

    // Qual passo está "na vez": o último cujo topo já passou da linha de leitura.
    // No celular essa linha fica abaixo do palco (que está preso no alto).
    function passoAtual() {
      var altura = window.innerHeight;
      var linha = altura * 0.56;
      if (telaEstreita.matches) {
        var fimDoPalco = palco.parentElement.getBoundingClientRect().bottom;
        linha = fimDoPalco + (altura - fimDoPalco) * 0.5;
      }
      var atual = 0;
      passos.forEach(function (li, i) {
        if (li.getBoundingClientRect().top <= linha) atual = i + 1;
      });
      return atual;
    }

    function mostrarPasso(n) {
      if (n === passoMostrado) return;
      var anterior = passoMostrado;
      passoMostrado = n;
      palco.dataset.passo = String(n);
      // Liga cada peça da folha cujo passo já chegou (e desliga as que têm "data-ate" vencido).
      pecas.forEach(function (peca) {
        var desde = parseInt(peca.dataset.desde, 10);
        var ate = peca.dataset.ate ? parseInt(peca.dataset.ate, 10) : 99;
        peca.classList.toggle("on", n >= desde && n <= ate);
      });
      passos.forEach(function (li, i) {
        li.classList.toggle("atual", i + 1 === n);
        li.classList.toggle("feito", i + 1 < n);      // passos já cumpridos: o trilho fica azul
      });
      marcas.forEach(function (marca, i) { marca.classList.toggle("on", i < n); });
      // O total é somado na frente da pessoa quando ela chega à Revisão.
      if (totalDaFolha && n >= 4 && anterior < 4 && anterior !== -1) contar(totalDaFolha, 710, 2, 800);
    }

    var pedido = false;
    function aoRolar() {
      pedido = false;
      var rolado = window.scrollY || raiz.scrollTop;
      var maximo = raiz.scrollHeight - window.innerHeight;
      if (progresso) progresso.style.transform = "scaleX(" + (maximo > 0 ? limitar(rolado / maximo, 0, 1) : 0) + ")";
      if (topo) topo.classList.toggle("rolou", rolado > 8);
      if (palco && passos.length) mostrarPasso(passoAtual());
      if (fecho && !menosMovimento.matches) {
        var caixa = fecho.getBoundingClientRect();
        var abre = limitar((window.innerHeight * 0.95 - caixa.top) / (window.innerHeight * 0.7), 0, 1);
        if (rolado >= maximo - 2) abre = 1;          // fim da página: sempre todo aberto
        fecho.style.setProperty("--abre", abre.toFixed(3));
      }
    }
    // No máximo uma atualização por quadro, e sem travar a rolagem ("passive").
    function pedirQuadro() {
      if (!pedido) { pedido = true; requestAnimationFrame(aoRolar); }
    }
    window.addEventListener("scroll", pedirQuadro, { passive: true });
    window.addEventListener("resize", pedirQuadro);
    aoRolar();
  } catch (erro) {
    // Qualquer falha: mostra a página inteira, sem animações.
    raiz.classList.remove("js");
    if (window.console) console.error(erro);
  }
})();
