/* ===================================================================
   STIMULUS EXPÉRIMENTAL — Fichier 3 sur 3 : comportement
   À placer dans le même dossier que index.html et style.css
   =================================================================== */

(function () {
  "use strict";

  /* =================================================================
     RÉGLAGES — tout ce qui est modifiable se trouve ici
     ================================================================= */
  var REGLAGES = {
    seuilDefilement: 0.35,   // fraction de l'article à parcourir pour déclencher (0.35 = 35 %)
    delaiSecours:    25,     // secondes : déclenchement si l'internaute n'a pas défilé
    dureeMax:        20,     // secondes : fermeture automatique, identique aux 2 conditions
    cleMemoire:      "vx_seance_v2"
  };

  /* Alphabet du code : ni O, ni 0, ni I, ni 1, ni l. 31 caractères. */
  var ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

  /* =================================================================
     ÉTAT DE LA SÉANCE
     ================================================================= */
  var etat = {
    condition:   null,    // 1 ou 2
    origine:     null,    // "D" = défilement, "T" = temps
    montre:      false,   // le voile a-t-il déjà été affiché ?
    ferme:       false,   // fermé par appui sur la croix ?
    toucheCarte: false,   // appui sur le corps de l'annonce ?
    dixiemes:    0        // durée d'exposition, en dixièmes de seconde
  };

  var horodatage       = 0;
  var minuterieSecours = null;
  var minuterieMax     = null;
  var ecouteDefilement = null;

  /* =================================================================
     MÉMOIRE DE SÉANCE — empêche le rejeu après rechargement
     ================================================================= */
  function lireMemoire() {
    try {
      var brut = window.sessionStorage.getItem(REGLAGES.cleMemoire);
      return brut ? JSON.parse(brut) : null;
    } catch (e) {
      return null;
    }
  }

  function ecrireMemoire() {
    try {
      window.sessionStorage.setItem(REGLAGES.cleMemoire, JSON.stringify(etat));
    } catch (e) {
      /* stockage indisponible : la page fonctionne quand même */
    }
  }

  /* =================================================================
     LECTURE DU PARAMÈTRE D'ADRESSE
     ================================================================= */
  function lireCondition() {
    var v = null;
    var chaine = window.location.search || "";
    var couples = chaine.replace(/^\?/, "").split("&");
    for (var i = 0; i < couples.length; i++) {
      var paire = couples[i].split("=");
      if (paire[0] === "c") { v = paire[1]; }
    }
    if (v === "1") { return 1; }
    if (v === "2") { return 2; }
    return null;
  }

  /* =================================================================
     CODE DE COMPLÉTION
     -----------------------------------------------------------------
     7 caractères :
       [1] condition   A = c=1 (croix présente)
                       B = c=2 (croix absente)
       [2] fermeture   K = croix touchée
                       N = croix non touchée
       [3] annonce     C = corps de l'annonce touché
                       N = non touché
       [4] origine     D = déclenché par le défilement
                       T = déclenché par le délai de secours
       [5][6] durée d'exposition en DIXIÈMES de seconde, codée en
              base 31 sur l'ALPHABET ci-dessus :
                valeur  = index(car5) * 31 + index(car6)
                secondes = valeur / 10
       [7] contrôle    somme des index des 6 caractères précédents,
                       modulo 31, converti par l'ALPHABET.
                       Sert à repérer les erreurs de recopie.
     ================================================================= */
  function fabriquerCode() {
    var c1 = (etat.condition === 1) ? "A" : "B";
    var c2 = etat.ferme ? "K" : "N";
    var c3 = etat.toucheCarte ? "C" : "N";
    var c4 = (etat.origine === "D") ? "D" : "T";

    var valeur = etat.dixiemes;
    if (valeur < 0)   { valeur = 0; }
    if (valeur > 960) { valeur = 960; }   // plafond : 2 caractères en base 31

    var c5 = ALPHABET.charAt(Math.floor(valeur / 31));
    var c6 = ALPHABET.charAt(valeur % 31);

    var six = c1 + c2 + c3 + c4 + c5 + c6;
    var somme = 0;
    for (var i = 0; i < six.length; i++) {
      somme += ALPHABET.indexOf(six.charAt(i));
    }
    var c7 = ALPHABET.charAt(somme % 31);

    return six + c7;
  }

  /* =================================================================
     RÉFÉRENCES AUX ÉLÉMENTS
     ================================================================= */
  var voile = document.getElementById("vxVoile");
  var carte = document.getElementById("vxCarte");
  var croix = document.getElementById("vxFermer");
  var cta   = document.getElementById("vxCta");

  /* =================================================================
     AFFICHAGE ET FERMETURE DU VOILE
     ================================================================= */
  function afficherVoile(origine) {
    if (etat.montre) { return; }

    etat.montre  = true;
    etat.origine = origine;
    horodatage   = Date.now();

    if (etat.condition === 1) {
      croix.style.display = "flex";
    } else if (croix && croix.parentNode) {
      croix.parentNode.removeChild(croix);
    }

    voile.classList.add("actif");
    document.body.style.overflow = "hidden";

    if (minuterieSecours) {
      clearTimeout(minuterieSecours);
      minuterieSecours = null;
    }
    if (ecouteDefilement) {
      window.removeEventListener("scroll", ecouteDefilement);
      ecouteDefilement = null;
    }

    minuterieMax = setTimeout(function () {
      masquerVoile(false);
    }, REGLAGES.dureeMax * 1000);

    ecrireMemoire();
  }

  function masquerVoile(parAppui) {
    if (!voile.classList.contains("actif")) { return; }

    etat.dixiemes = Math.round((Date.now() - horodatage) / 100);
    etat.ferme    = !!parAppui;

    if (minuterieMax) {
      clearTimeout(minuterieMax);
      minuterieMax = null;
    }

    voile.classList.remove("actif");
    document.body.style.overflow = "";
    ecrireMemoire();
  }

  /* =================================================================
     BOUTON DE FIN DE LECTURE
     ================================================================= */
  function brancherFin() {
    var bouton = document.getElementById("vxRevele");

    bouton.addEventListener("click", function () {
      /* Si le voile n'a jamais été montré, la séance est incomplète. */
      if (!etat.montre) {
        bouton.textContent = "Merci de poursuivre votre lecture";
        return;
      }
      document.getElementById("vxValeur").textContent = fabriquerCode();
      document.getElementById("vxJeton").classList.add("actif");
      bouton.style.display = "none";
    });
  }

  /* =================================================================
     DÉMARRAGE
     ================================================================= */
  function demarrer() {
    var condition = lireCondition();

    /* Paramètre absent ou invalide : on n'affiche rien d'autre. */
    if (condition === null) {
      document.getElementById("vxAlerte").style.display = "block";
      return;
    }

    document.getElementById("vxPage").style.display = "block";

    var ancien = lireMemoire();
    if (ancien && ancien.montre && ancien.condition === condition) {
      /* Séance déjà jouée : on restaure sans réafficher le voile. */
      etat = ancien;
      brancherFin();
      return;
    }

    etat.condition = condition;

    /* Déclenchement par le défilement. */
    ecouteDefilement = function () {
      var doc   = document.documentElement;
      var haut  = window.pageYOffset || doc.scrollTop || 0;
      var total = Math.max(1, doc.scrollHeight - window.innerHeight);
      if ((haut / total) >= REGLAGES.seuilDefilement) {
        afficherVoile("D");
      }
    };
    window.addEventListener("scroll", ecouteDefilement, { passive: true });

    /* Déclenchement de secours, si l'internaute ne défile pas. */
    minuterieSecours = setTimeout(function () {
      afficherVoile("T");
    }, REGLAGES.delaiSecours * 1000);

    brancherFin();
  }

  /* =================================================================
     ÉCOUTEURS DU VOILE
     ================================================================= */
  if (croix) {
    croix.addEventListener("click", function (ev) {
      ev.stopPropagation();
      masquerVoile(true);
    });
  }

  /* Appui sur le corps de l'annonce : enregistré, sans navigation. */
  carte.addEventListener("click", function () {
    etat.toucheCarte = true;
    ecrireMemoire();
  });

  cta.addEventListener("click", function (ev) {
    ev.stopPropagation();
    etat.toucheCarte = true;
    cta.textContent = "Demande enregistrée";
    ecrireMemoire();
  });

  demarrer();
})();
