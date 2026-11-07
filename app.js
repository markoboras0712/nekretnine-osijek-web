/* Nekretnine Osijek i okolica: statični pregled (podaci.json osvježava alat na Macu). */
(function () {
  "use strict";

  var VRSTE = { stan: "Stan", kuca: "Kuća", zemljiste: "Zemljište", poslovni: "Poslovni prostor", ostalo: "Ostalo" };
  var OZNAKE = { favorit: "Favorit", za_obilazak: "Za obilazak", kontaktirano: "Kontaktirano", odbaceno: "Odbačeno" };
  var POGLEDI = [
    ["novo", "Novo za mene"], ["sve", "Sve"], ["favoriti", "Favoriti"], ["rokovi", "Rokovi"],
    ["odbaceno", "Odbačeno"], ["nestali", "Nestali"]
  ];
  var PO_STRANICI = 40;
  var VRSTE_ZADANO = "stan,kuca,zemljiste";
  var CIJENE_BRZO = [["do 80k", "", "80000"], ["80–120k", "80000", "120000"], ["120–180k", "120000", "180000"],
    ["180–250k", "180000", "250000"], ["250k+", "250000", ""]];
  var SOBE = [["1", "1"], ["2", "2"], ["3", "3"], ["4", "4+"]];
  var KAT = [["pr", "Prizemlje"], ["nisko", "1.–2. kat"], ["visoko", "3. kat i više"], ["nezadnji", "Nije zadnji kat"]];
  var BRZO = [["tjedan", "Novo u zadnjih 7 dana"], ["pad", "Pala cijena"], ["ispod", "10 %+ ispod prosjeka"],
    ["foto", "S fotografijom"], ["tel", "S brojem telefona"], ["bezag", "Bez agencija"], ["bezudjela", "Bez suvlasničkih udjela"],
    ["dra", "Samo natječaji i dražbe"]];
  // "Po mojim željama": što je kome važno (spremljeno u pregledniku, svatko svoje)
  var ZELJE = [["prosjek", "Cijena ispod prosjeka"], ["cijena", "Niža cijena"], ["povrsina", "Veća površina"],
    ["zemljiste", "Veća okućnica"], ["sobe", "Više soba"], ["novo", "Tek objavljeno"], ["pad", "Pala cijena"]];
  var IZBJEGAVAM = [["adaptacija", "Za adaptaciju"], ["prizemlje", "Prizemlje"], ["zadnji", "Zadnji kat"],
    ["agencija", "Preko agencije"], ["udio", "Suvlasnički udio"]];
  var LISTE = ["vrste", "opcine", "mjesta", "sobe", "kat", "zn", "brzo"];
  var BROJEVI = ["cmin", "cmax", "pmin", "pmax", "zmin", "m2max"];
  // isti pojam, različite riječi (pretraga traži bilo koju)
  var SINONIMI = [["lift", "dizalo"], ["okucnica", "dvoriste", "vrt"], ["novogradnja", "nova gradnja", "novoizgraden", "u izgradnji"],
    ["garaza", "garazno"], ["balkon", "terasa", "lodja", "loggia"], ["parking", "parkirno"], ["centar", "centru"],
    ["jug 2", "jug ii"], ["jug ii", "jug 2"], ["kuca", "obiteljska kuca", "katnica", "prizemnica"], ["zemljiste", "parcela", "plac"],
    ["namjesten", "namjesteno", "namjestaj"], ["renoviran", "adaptiran", "obnovljen", "preureden"],
    ["podrum", "spremiste"], ["klima", "klimatiziran"], ["poslovni", "poslovni prostor", "lokal", "ured"],
    ["jednosob", "1 soba", "garsonijer"], ["dvosob", "2 sobe", "2-sob"], ["trosob", "3 sobe", "3-sob"],
    ["cetverosob", "cetvorosob", "4 sobe", "4-sob"]];
  var SOBE_RIJECI = [["garsonijera", 1], ["jednosoban", 1], ["dvosoban", 2], ["trosoban", 3], ["cetverosoban", 4],
    ["peterosoban", 4]];

  var podaci = null;
  function prazno() {
    var s = { pogled: "sve", vrste: VRSTE_ZADANO.split(","), opcine: [], mjesta: [], sobe: [], kat: [], zn: [], brzo: [],
      trazi: "", sort: "ocjena", smjer: 0, prikaz: "popis" };
    BROJEVI.forEach(function (k) { s[k] = ""; });
    return s;
  }
  var stanje = prazno();
  var prikazano = PO_STRANICI;
  var svaMjesta = false;
  var sortPrijeTrazenja = null;
  var rezultat = {};   // id -> relevantnost za trenutnu pretragu

  // ---------- spremanje u pregledniku (može ne raditi u privatnom načinu) ----------
  function citaj(k, zadano) {
    try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : zadano; } catch (e) { return zadano; }
  }
  function pisi(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* nema spremanja */ } }
  var oznake = citaj("nek_oznake", {});
  var vidjeno = citaj("nek_vidjeno", {});
  var pretrage = citaj("nek_pretrage", []);

  function postaviOznaku(id, ozn) {
    if (oznake[id] === ozn || !ozn) { delete oznake[id]; } else { oznake[id] = ozn; }
    vidjeno[id] = Date.now();
    pisi("nek_oznake", oznake); pisi("nek_vidjeno", vidjeno);
  }

  // ---------- oblikovanje ----------
  function eur(v) { return v == null ? "" : Math.round(v).toLocaleString("hr-HR") + " €"; }
  function tis(v) { return (+v).toLocaleString("hr-HR"); }
  function m2(v) { return v ? Math.round(v).toLocaleString("hr-HR") + " m²" : ""; }
  function vrijeme(ts) { return ts ? new Date(ts.replace(" ", "T")).getTime() : null; }
  function prije(ts) {
    if (!ts) { return ""; }
    var d = Math.floor((Date.now() - vrijeme(ts)) / 86400000);
    if (d <= 0) { return "danas"; }
    if (d === 1) { return "jučer"; }
    if (d < 14) { return "prije " + d + " dana"; }
    if (d < 60) { return "prije " + Math.floor(d / 7) + " tj."; }
    return "prije " + Math.floor(d / 30) + " mj.";
  }
  function prijeKratko(ts) {
    var min = Math.round((Date.now() - vrijeme(ts)) / 60000);
    if (min < 2) { return "upravo"; }
    if (min < 60) { return "prije " + min + " min"; }
    if (min < 1440) { return "prije " + Math.round(min / 60) + " h"; }
    return prije(ts);
  }
  function sobeTekst(s) {
    if (!s) { return ""; }
    var b = String(s).replace(".", ",");
    return b + (s === 1 ? " soba" : s < 5 && s % 1 === 0 ? " sobe" : " soba");
  }
  function katTekst(n) {
    if (n.vrsta !== "stan") { return ""; }
    if (n.kat == null) { return n.zadnji_kat ? "zadnji kat" : ""; }
    var t = n.kat < 0 ? "suteren" : n.kat === 0 ? "prizemlje" : n.kat + ". kat";
    return t + (n.zadnji_kat && n.kat > 0 ? " (zadnji)" : "");
  }
  function mjesto(n) { return n.opcina === "Osijek" ? (n.kvart || "") : (n.naselje || ""); }
  function mjestoPrikaz(n) { return n.opcina === "Osijek" && n.kvart ? n.kvart : n.naselje; }
  function naPonudu() {
    var p = document.getElementById("ponuda");
    if (window.scrollY > p.offsetTop) { window.scrollTo(0, p.offsetTop); }
  }
  function el(tag, atr, djeca) {
    var e = document.createElement(tag);
    Object.keys(atr || {}).forEach(function (k) {
      if (k === "tekst") { e.textContent = atr[k]; }
      else if (k.slice(0, 2) === "on") { e.addEventListener(k.slice(2), atr[k]); }
      else if (atr[k] !== false && atr[k] != null) { e.setAttribute(k, atr[k] === true ? "" : atr[k]); }
    });
    (djeca || []).forEach(function (d) { if (d) { e.appendChild(typeof d === "string" ? document.createTextNode(d) : d); } });
    return e;
  }
  function slika(n, malo) {
    var okvir = el("div", { "class": "slika" });
    if (n.slika) {
      var img = el("img", { src: n.slika, alt: "", loading: malo ? "lazy" : "eager", referrerpolicy: "no-referrer", decoding: "async" });
      img.addEventListener("error", function () { img.remove(); okvir.appendChild(el("div", { "class": "bez", tekst: "Fotografija nije dostupna" })); });
      okvir.appendChild(img);
    } else {
      okvir.classList.add("prazna");
      okvir.appendChild(el("div", { "class": "bez", tekst: "Bez fotografije" }));
    }
    return okvir;
  }
  function prosjekZnacka(n) {
    if (n.vs_prosjek == null) { return null; }
    var v = n.vs_prosjek;
    if (v > -5 && v < 5) { return el("span", { "class": "prosjek", tekst: "oko prosjeka" }); }
    return el("span", { "class": "prosjek " + (v < 0 ? "dobro" : "lose"),
      tekst: (v < 0 ? "" : "+") + v + " % od prosjeka", title: "€/m² u odnosu na prosjek za " + (mjestoPrikaz(n) || "") });
  }

  // ---------- pretraga ----------
  // Usporedba bez kvačica i velikih slova; svaki znak ostaje na istom mjestu (za isticanje pogotka u izvornom tekstu).
  function norm(s) {
    s = (s || "").toLowerCase();
    return /[^\x00-\x7f]/.test(s) ? s.replace(/[^\x00-\x7f]/g, function (c) {
      return c === "đ" ? "d" : c.normalize("NFD").charAt(0);
    }) : s;
  }
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  // Riječ se traži po početku, a kraj (padež) se odbaci: "garaze" nađe garažu, "kuce" nađe kuću.
  function korijen(r) { return r.length >= 4 && /[aeiou]$/.test(r) ? r.slice(0, -1) : r; }
  function uzorak(rijec, fraza) {
    var dijelovi = rijec.split(/\s+/).filter(Boolean);
    var tijelo = dijelovi.map(function (d, i) {
      return esc(i === dijelovi.length - 1 && !fraza ? korijen(d) : d);
    }).join("\\s+");
    return "(^|[^a-z0-9])" + tijelo + (/\d$/.test(rijec) ? "(?![0-9])" : "");
  }
  function inacice(r, fraza) {
    var v = [r];
    if (r.indexOf("dj") >= 0) { v.push(r.replace(/dj/g, "d")); }
    var k = korijen(r);
    SINONIMI.forEach(function (g) {
      if (g.some(function (w) {
        return w === r || (!fraza && r.length >= 4 && (korijen(w) === k || (w.length >= 5 && r.indexOf(w) === 0)));
      })) {
        g.forEach(function (w) { if (v.indexOf(w) < 0) { v.push(w); } });
      }
    });
    return new RegExp(v.map(function (x) { return uzorak(x, fraza || x.indexOf(" ") > 0); }).join("|"));
  }
  var VISE_RIJECI = [];  // nazivi mjesta s više riječi: "jug 2", "donji grad" traže se kao fraza
  function rastavi(q) {
    q = norm(q).trim();
    VISE_RIJECI.forEach(function (f) {
      var i = q.indexOf(f);
      if (i >= 0 && q.charAt(i - 1) !== "\"") { q = q.slice(0, i) + "\"" + f + "\"" + q.slice(i + f.length); }
    });
    var upiti = [], re = /(-?)"([^"]+)"|(-?)(\S+)/g, m;
    while ((m = re.exec(q))) {
      var tekst = (m[2] || m[4] || "").trim(), neg = !!(m[1] || m[3]);
      if (!tekst || (!m[2] && tekst.length < 2 && !/\d/.test(tekst))) { continue; }
      upiti.push({ tekst: tekst, ne: neg, re: inacice(tekst, !!m[2]) });
    }
    return upiti;
  }
  function relevantnost(n, upiti) {
    var b = 0;
    for (var i = 0; i < upiti.length; i++) {
      var u = upiti[i], uNaslovu = u.re.test(n._tn), uOstalom = !uNaslovu && u.re.test(n._to);
      if (u.ne) { if (uNaslovu || uOstalom) { return 0; } continue; }
      if (!uNaslovu && !uOstalom) { return 0; }
      b += uNaslovu ? 3 : 1;
    }
    return b || 0.5;
  }
  function pretrazi() {
    rezultat = {};
    var upiti = rastavi(stanje.trazi);
    trenutniUpiti = upiti;
    if (!upiti.length) { rezultat = null; return; }
    podaci.nekretnine.forEach(function (n) { var r = relevantnost(n, upiti); if (r) { rezultat[n.id] = r; } });
  }
  var trenutniUpiti = [];
  // Tekst s istaknutim pogocima (bez innerHTML: tekst oglasa nikad se ne tumači kao HTML)
  function istakni(izvorni, normaliziran, od, do_) {
    var raspon = [];
    trenutniUpiti.forEach(function (u) {
      if (u.ne) { return; }
      var g = new RegExp(u.re.source, "g"), m, dio = normaliziran.slice(od, do_);
      while ((m = g.exec(dio))) {
        var p = m.index + (/^[^a-z0-9]/.test(m[0]) ? 1 : 0);
        raspon.push([od + p, od + m.index + m[0].length]);
        if (m[0].length === 0) { g.lastIndex++; }
      }
    });
    raspon.sort(function (a, b) { return a[0] - b[0]; });
    var van = [], poz = od;
    raspon.forEach(function (r) {
      if (r[0] < poz) { return; }
      if (r[0] > poz) { van.push(izvorni.slice(poz, r[0])); }
      van.push(el("mark", { tekst: izvorni.slice(r[0], r[1]) }));
      poz = r[1];
    });
    if (poz < do_) { van.push(izvorni.slice(poz, do_)); }
    return van;
  }
  function isjecak(n) {
    if (!rezultat || !n.opis) { return null; }
    var prvi = -1;
    trenutniUpiti.forEach(function (u) {
      if (u.ne) { return; }
      var m = u.re.exec(n._no);
      if (m) {
        var p = m.index + (/^[^a-z0-9]/.test(m[0]) ? 1 : 0);
        if (prvi < 0 || p < prvi) { prvi = p; }
      }
    });
    if (prvi < 0) { return null; }
    var od = Math.max(0, prvi - 50), do_ = Math.min(n.opis.length, prvi + 110);
    if (od > 0) { var r = n.opis.indexOf(" ", od); if (r > 0 && r < prvi) { od = r + 1; } }
    var dijelovi = istakni(n.opis, n._no, od, do_);
    return el("div", { "class": "isjecak" }, [od > 0 ? "…" : ""].concat(dijelovi).concat([do_ < n.opis.length ? "…" : ""]));
  }

  // ---------- URL (dijeljenje filtera) ----------
  function uUrl() {
    var p = new URLSearchParams();
    if (stanje.pogled !== "sve") { p.set("p", stanje.pogled); }
    if (stanje.vrste.join() !== VRSTE_ZADANO) { p.set("v", stanje.vrste.join(",")); }
    [["opcine", "o"], ["mjesta", "m"], ["sobe", "s"], ["kat", "kat"], ["zn", "zn"], ["brzo", "b"]].forEach(function (x) {
      if (stanje[x[0]].length) { p.set(x[1], stanje[x[0]].join(",")); }
    });
    BROJEVI.concat(["trazi"]).forEach(function (k) { if (stanje[k]) { p.set(k, stanje[k]); } });
    if (stanje.sort !== "ocjena" && stanje.sort !== "relevantno") { p.set("sort", stanje.sort); }
    if (stanje.smjer && stanje.sort !== "relevantno") { p.set("smjer", stanje.smjer > 0 ? "gore" : "dolje"); }
    if (stanje.prikaz === "karta") { p.set("prikaz", "karta"); }
    var q = p.toString();
    history.replaceState(null, "", location.pathname + (q ? "?" + q : "") + location.hash);
    return q;
  }
  var STARI_SORT = { novo: ["datum", -1], najdulje: ["datum", 1], cijena_up: ["cijena", 1], cijena_down: ["cijena", -1] };
  function izUrla(trazi) {
    var p = new URLSearchParams(trazi != null ? trazi : location.search);
    var pogled = stanje.pogled;
    stanje = prazno();
    stanje.pogled = p.get("p") || (trazi != null ? pogled : "sve");
    if (p.get("v") != null) { stanje.vrste = p.get("v") ? p.get("v").split(",") : []; }
    [["opcine", "o"], ["mjesta", "m"], ["sobe", "s"], ["kat", "kat"], ["zn", "zn"], ["brzo", "b"]].forEach(function (x) {
      if (p.get(x[1])) { stanje[x[0]] = p.get(x[1]).split(","); }
    });
    if (p.get("bezag") === "1" && stanje.brzo.indexOf("bezag") < 0) { stanje.brzo.push("bezag"); }
    if (p.get("dra") === "1" && stanje.brzo.indexOf("dra") < 0) { stanje.brzo.push("dra"); }
    BROJEVI.concat(["trazi"]).forEach(function (k) { if (p.get(k)) { stanje[k] = p.get(k); } });
    var spremljen = citaj("nek_sort", "ocjena");
    var sort = p.get("sort") || (typeof spremljen === "string" ? spremljen : spremljen && spremljen[0]) || "ocjena";
    var smjer = p.get("smjer") === "gore" ? 1 : p.get("smjer") === "dolje" ? -1
      : (!p.get("sort") && Array.isArray(spremljen) && spremljen[1]) || 0;
    if (STARI_SORT[sort]) { smjer = STARI_SORT[sort][1]; sort = STARI_SORT[sort][0]; }
    stanje.sort = SORTOVI[sort] ? sort : "ocjena";
    stanje.prikaz = p.get("prikaz") === "karta" ? "karta" : "popis";
    stanje.smjer = smjer;
    if (stanje.trazi) { sortPrijeTrazenja = [stanje.sort, stanje.smjer]; if (!p.get("sort")) { stanje.sort = "relevantno"; } }
  }

  // ---------- filtriranje ----------
  function u(lista, v) { return lista.indexOf(v) >= 0; }
  function sobeKos(s) { return s == null ? null : s < 1.75 ? "1" : s < 2.75 ? "2" : s < 3.75 ? "3" : "4"; }
  function katOk(n, k) {
    if (k === "pr") { return n.kat != null && n.kat <= 0; }
    if (k === "nisko") { return n.kat === 1 || n.kat === 2; }
    return n.kat != null && n.kat >= 3;
  }
  function brzoOk(n, k) {
    switch (k) {
      case "tjedan": return n.od && Date.now() - vrijeme(n.od) < 7 * 86400000;
      case "pad": return !!n.pad;
      case "ispod": return n.vs_prosjek != null && n.vs_prosjek <= -10;
      case "foto": return !!n.slika;
      case "tel": return !!n.telefon;
      case "bezag": return n.prodavac !== "agencija" && !n.agencija;
      case "dra": return n.nacin !== "oglas";
      case "bezudjela": return !jeUdio(n);
    }
    return true;
  }
  var SKUPINE = {
    vrste: function (n) { return !stanje.vrste.length || u(stanje.vrste, n.vrsta); },
    opcine: function (n) { return !stanje.opcine.length || u(stanje.opcine, n.opcina); },
    mjesta: function (n) { return !stanje.mjesta.length || u(stanje.mjesta, mjesto(n)); },
    cijena: function (n) {
      var c = n.cijena;
      return !(stanje.cmin && c != null && c < +stanje.cmin) && !(stanje.cmax && c != null && c > +stanje.cmax);
    },
    povrsina: function (n) {
      if (n.vrsta !== "zemljiste") {
        if (stanje.pmin && (n.povrsina == null || n.povrsina < +stanje.pmin)) { return false; }
        if (stanje.pmax && (n.povrsina == null || n.povrsina > +stanje.pmax)) { return false; }
      }
      if (stanje.zmin && (n.zemljiste == null || n.zemljiste < +stanje.zmin)) { return false; }
      return !(stanje.m2max && (n.eur_m2 == null || n.eur_m2 > +stanje.m2max));
    },
    sobe: function (n) { return !stanje.sobe.length || u(stanje.sobe, sobeKos(n.sobe)); },
    kat: function (n) {
      if (!stanje.kat.length) { return true; }
      if (n.vrsta !== "stan") { return false; }
      if (u(stanje.kat, "nezadnji") && n.zadnji_kat) { return false; }
      var raspon = stanje.kat.filter(function (k) { return k !== "nezadnji"; });
      return !raspon.length || raspon.some(function (k) { return katOk(n, k); });
    },
    zn: function (n) { return stanje.zn.every(function (z) { return u(n.znacajke || [], z); }); },
    brzo: function (n) { return stanje.brzo.every(function (k) { return brzoOk(n, k); }); },
    trazi: function (n) { return !rezultat || !!rezultat[n.id]; }
  };
  var IMENA_SKUPINA = Object.keys(SKUPINE);
  function prolazi(n, osim) {
    for (var i = 0; i < IMENA_SKUPINA.length; i++) {
      var s = IMENA_SKUPINA[i];
      if (s !== osim && !SKUPINE[s](n)) { return false; }
    }
    return true;
  }
  function uPogledu(n, pogled) {
    var o = oznake[n.id];
    switch (pogled) {
      case "novo": return n.aktivan && !vidjeno[n.id] && o !== "odbaceno";
      case "favoriti": return o === "favorit" || o === "za_obilazak" || o === "kontaktirano";
      case "odbaceno": return o === "odbaceno";
      case "nestali": return !n.aktivan;
      case "rokovi": return n.aktivan && danaDoRoka(n) != null && danaDoRoka(n) >= 0 && o !== "odbaceno";
      default: return n.aktivan && o !== "odbaceno";
    }
  }
  // Za brojke na čipovima: nekretnine u trenutnom pogledu koje prolaze sve filtere osim te skupine.
  function bezSkupine(skupina) {
    return podaci.nekretnine.filter(function (n) { return uPogledu(n, stanje.pogled) && prolazi(n, skupina); });
  }

  // ---------- sortiranje ----------
  function brojIzvora(n) {
    return n.izvori.map(function (i) { return i.naziv; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).length;
  }
  function danaNaTrzistu(n) { return n.od ? Math.floor((Date.now() - vrijeme(n.od)) / 86400000) : null; }
  function jeUdio(n) { return (n.predmet || "").indexOf("udio") === 0; }

  // ---------- moje želje ----------
  var zelje = citaj("nek_zelje", {});
  function imaZelja() { return Object.keys(zelje).some(function (k) { return zelje[k] > 0; }); }
  function rangiraj(lista) {
    // položaj vrijednosti među nekretninama iste vrste (0 = najmanja, 1 = najveća)
    ["cijena", "povrsina", "zemljiste", "sobe"].forEach(function (p) {
      var po = {};
      lista.forEach(function (n) { if (n[p] != null) { (po[n.vrsta] = po[n.vrsta] || []).push(n[p]); } });
      Object.keys(po).forEach(function (v) { po[v].sort(function (a, b) { return a - b; }); });
      lista.forEach(function (n) {
        var niz = po[n.vrsta];
        n["_r_" + p] = n[p] == null || !niz ? null : niz.length < 2 ? 0.5 : niz.indexOf(n[p]) / (niz.length - 1);
      });
    });
  }
  function izbjegava(n, k) {
    switch (k) {
      case "adaptacija": return (n.znacajke || []).indexOf("adaptacija") >= 0;
      case "prizemlje": return n.vrsta === "stan" && n.kat != null && n.kat <= 0;
      case "zadnji": return !!n.zadnji_kat;
      case "agencija": return n.prodavac === "agencija" || !!n.agencija;
      case "udio": return jeUdio(n);
    }
    return false;
  }
  function komponenta(n, k) {
    switch (k) {
      case "prosjek": return n.vs_prosjek == null ? 0 : Math.max(-0.5, Math.min(1, -n.vs_prosjek / 30));
      case "cijena": return n._r_cijena == null ? 0 : 1 - n._r_cijena;
      case "povrsina": return n.vrsta === "zemljiste" ? 0 : n._r_povrsina || 0;
      case "zemljiste": return n._r_zemljiste || 0;
      case "sobe": return n._r_sobe || 0;
      case "novo": var d = danaNaTrzistu(n); return d == null ? 0 : Math.max(0, 1 - d / 60);
      case "pad": return n.pad ? Math.min(1, n.pad.posto / 10) : 0;
    }
    return (n.znacajke || []).indexOf(k) >= 0 ? 1 : 0;   // značajka iz opisa
  }
  function nazivZelje(k) {
    var z = ZELJE.concat(IZBJEGAVAM).filter(function (x) { return x[0] === k; })[0];
    return z ? z[1] : (podaci.znacajke || {})[k] || k;
  }
  // 0-100: koliko nekretnina odgovara tvojim željama, i zašto
  function mojaOcjena(n) {
    if (n._moja && n._moja.verzija === verzijaZelja) { return n._moja; }
    var zbroj = 0, tez = 0, zasto = [];
    Object.keys(zelje).forEach(function (k) {
      var w = zelje[k];
      if (w > 0) {
        var c = komponenta(n, k);
        zbroj += w * c; tez += w;
        if (c >= 0.6) { zasto.push(k === "prosjek" ? -n.vs_prosjek + " % ispod prosjeka" : nazivZelje(k).toLowerCase()); }
      }
    });
    var o = tez ? zbroj / tez : n.ocjena / 100;
    Object.keys(zelje).forEach(function (k) {
      if (zelje[k] < 0 && izbjegava(n, k)) { o -= 0.25; zasto.push("− " + nazivZelje(k).toLowerCase()); }
    });
    n._moja = { verzija: verzijaZelja, ocjena: Math.max(0, Math.round(o * 100)), zasto: zasto };
    return n._moja;
  }
  var verzijaZelja = 1;

  var SORTOVI = {
    relevantno: { smjer: -1, v: function (n) { return rezultat ? rezultat[n.id] : null; } },
    ocjena: { smjer: -1, v: function (n) { return n.ocjena; }, t: ["najslabije prvo", "najbolje prvo"] },
    datum: { smjer: -1, v: function (n) { return vrijeme(n.od); }, t: ["najstarije prvo", "najnovije prvo"] },
    cijena: { smjer: 1, v: function (n) { return n.cijena; }, t: ["najjeftinije prvo", "najskuplje prvo"] },
    m2: { smjer: 1, v: function (n) { return n.eur_m2; }, t: ["najniža prvo", "najviša prvo"] },
    prosjek: { smjer: 1, v: function (n) { return n.vs_prosjek; }, t: ["najviše ispod prosjeka", "najviše iznad prosjeka"] },
    povrsina: { smjer: -1, v: function (n) { return n.vrsta === "zemljiste" ? null : n.povrsina; }, t: ["najmanja prvo", "najveća prvo"] },
    zemljiste: { smjer: -1, v: function (n) { return n.zemljiste; }, t: ["najmanje prvo", "najveće prvo"] },
    sobe: { smjer: -1, v: function (n) { return n.sobe; }, t: ["najmanje soba prvo", "najviše soba prvo"] },
    pad: { smjer: -1, v: function (n) { return n.pad ? n.pad.posto : null; }, t: ["najmanji pad prvo", "najveći pad prvo"] },
    izvori: { smjer: -1, v: brojIzvora, t: ["najmanje izvora prvo", "najviše izvora prvo"] },
    moje: { smjer: -1, v: function (n) { return mojaOcjena(n).ocjena; }, t: ["najmanje odgovara prvo", "najviše odgovara prvo"] }
  };
  function smjer() { return stanje.smjer || SORTOVI[stanje.sort].smjer; }
  // Bez vrijednosti uvijek na kraj (u oba smjera); kod jednakih: bolja ocjena, pa novija.
  function usporedi(a, b) {
    var s = SORTOVI[stanje.sort], x = s.v(a), y = s.v(b);
    var nx = x == null || isNaN(x), ny = y == null || isNaN(y);
    if (nx || ny) { if (nx !== ny) { return nx - ny; } }
    else if (x !== y) { return (x - y) * smjer(); }
    return (b.ocjena - a.ocjena) || ((vrijeme(b.od) || 0) - (vrijeme(a.od) || 0));
  }
  // Vrijednost po kojoj se sortira, istaknuta na kartici
  function istaknuto(n) {
    switch (stanje.sort) {
      case "pad":
        return n.pad ? el("span", { "class": "istaknuto dobro", tekst: "−" + eur(n.pad.eur) + " (−" +
          String(n.pad.posto).replace(".", ",") + " %) " + prije(n.pad.datum) }) : null;
      case "datum":
        if (smjer() < 0) { return null; }
        var d = danaNaTrzistu(n);
        return d != null ? el("span", { "class": "istaknuto", tekst: "na tržištu " + d + " " + (d === 1 ? "dan" : "dana") }) : null;
      case "zemljiste":
        return n.zemljiste ? el("span", { "class": "istaknuto", tekst: "zemljište " + m2(n.zemljiste) }) : null;
      case "povrsina":
        return n.povrsina ? el("span", { "class": "istaknuto", tekst: "površina " + m2(n.povrsina) }) : null;
      case "moje":
        var m = mojaOcjena(n);
        return el("span", { "class": "istaknuto" + (m.ocjena >= 60 ? " dobro" : ""), tekst: "odgovara ti " + m.ocjena + " %"
          + (m.zasto.length ? " · " + m.zasto.slice(0, 3).join(", ") : "") });
      case "izvori":
        var b = brojIzvora(n);
        return el("span", { "class": "istaknuto", tekst: "na " + b + " " + (b === 1 ? "izvoru" : "izvora") });
      default:
        return n.pad && n.pad.posto >= 3 ? el("span", { "class": "istaknuto dobro", tekst: "cijena pala " +
          String(n.pad.posto).replace(".", ",") + " %" }) : null;
    }
  }

  // ---------- prikaz ----------
  function kartica(n) {
    var o = oznake[n.id];
    var znacke = el("div", { "class": "znacke" }, [
      !vidjeno[n.id] && n.aktivan ? el("span", { "class": "znacka dobro", tekst: "Novo" }) : null,
      n.nacin !== "oglas" ? el("span", { "class": "znacka upoz", tekst: n.nacin === "drazba" ? "Dražba" : "Natječaj" }) : null,
      jeUdio(n) ? el("span", { "class": "znacka upoz", tekst: n.predmet === "udio?" ? "Možda udio" : "Udio" }) : null,
      !n.aktivan ? el("span", { "class": "znacka", tekst: "Nestao" }) : null,
      o ? el("span", { "class": "znacka", tekst: OZNAKE[o] }) : null
    ]);
    var sl = slika(n, true);
    sl.appendChild(znacke);
    var cinj = [VRSTE[n.vrsta] || n.vrsta, mjestoPrikaz(n), m2(n.povrsina), sobeTekst(n.sobe), katTekst(n),
      n.zemljiste ? "zemljište " + m2(n.zemljiste) : ""].filter(Boolean).join(" · ");
    var naslov = el("div", { "class": "naslov-k" }, rezultat ? istakni(n.naslov, norm(n.naslov), 0, n.naslov.length) : [n.naslov]);
    var k = el("article", { "class": "kartica" + (o === "odbaceno" ? " odbaceno" : ""), tabindex: "0",
      "aria-label": cinj + ", " + (eur(n.cijena) || "cijena na upit") }, [
      sl,
      el("div", { "class": "tijelo" }, [
        el("div", { "class": "cijena" }, [eur(n.cijena) || "Cijena na upit",
          n.eur_m2 ? el("span", { "class": "m2", tekst: n.eur_m2.toLocaleString("hr-HR") + " €/m²" }) : null, prosjekZnacka(n)]),
        el("div", { "class": "cinjenice", tekst: cinj }),
        istaknuto(n),
        rokTekst(n) ? el("span", { "class": "istaknuto rok" + (danaDoRoka(n) <= 3 ? " hitno" : ""), tekst: rokTekst(n) }) : null,
        naslov,
        isjecak(n),
        el("div", { "class": "dno-k" }, [
          el("span", { "class": "izvori-k", tekst: prije(n.od) + " · " + n.izvori.map(function (i) { return i.naziv; })
            .filter(function (v, i, a) { return a.indexOf(v) === i; }).join(", ") }),
          el("span", { "class": "akcije" }, [
            el("button", { "class": "ikona", "aria-pressed": uUsporedbi(n.id) ? "true" : "false", title: "Dodaj u usporedbu",
              "aria-label": "Usporedi", tekst: "⇄", onclick: function (e) { e.stopPropagation(); prebaciUsporedbu(n.id); prikazi(); } }),
            el("button", { "class": "ikona", "aria-pressed": o === "favorit" ? "true" : "false", title: "Favorit", "aria-label": "Favorit",
              tekst: "★", onclick: function (e) { e.stopPropagation(); postaviOznaku(n.id, "favorit"); prikazi(); } }),
            el("button", { "class": "ikona", "aria-pressed": o === "odbaceno" ? "true" : "false", title: "Odbaci", "aria-label": "Odbaci",
              tekst: "✕", onclick: function (e) { e.stopPropagation(); postaviOznaku(n.id, "odbaceno"); prikazi(); } })
          ])
        ])
      ])
    ]);
    function otvori() { location.hash = "n=" + encodeURIComponent(n.id); }
    k.addEventListener("click", otvori);
    k.addEventListener("keydown", function (e) { if (e.key === "Enter") { otvori(); } });
    return k;
  }

  function promijeni() { prikazano = PO_STRANICI; uUrl(); prikazi(); }
  function prebaci(polje, v) {
    var i = stanje[polje].indexOf(v);
    if (i >= 0) { stanje[polje].splice(i, 1); } else { stanje[polje].push(v); }
    promijeni();
  }
  // Čipovi s brojem nekretnina koje bi ostale nakon klika (uz sve ostale filtere)
  function cipovi(id, opcije, polje, broji) {
    var k = document.getElementById(id);
    k.innerHTML = "";
    opcije.forEach(function (op) {
      var ukljucen = op.ukljucen != null ? op.ukljucen : u(stanje[polje], op[0]);
      var b = broji ? broji(op) : null;
      k.appendChild(el("button", { "class": "cip" + (b === 0 && !ukljucen ? " nula" : ""), type: "button",
        "aria-pressed": ukljucen ? "true" : "false",
        onclick: op.klik || function () { prebaci(polje, op[0]); } },
        [op[1], b != null ? el("span", { "class": "broj", tekst: String(b) }) : null]));
    });
  }
  function brojac(lista, fn) {
    var c = {};
    lista.forEach(function (n) { [].concat(fn(n)).forEach(function (v) { if (v != null && v !== "") { c[v] = (c[v] || 0) + 1; } }); });
    return c;
  }
  function prikaziFiltere() {
    var bv = brojac(bezSkupine("vrste"), function (n) { return n.vrsta; });
    cipovi("f-vrsta", Object.keys(VRSTE).map(function (k) { return [k, VRSTE[k]]; }), "vrste", function (op) { return bv[op[0]] || 0; });
    var bo = brojac(bezSkupine("opcine"), function (n) { return n.opcina; });
    cipovi("f-opcina", Object.keys(podaci.podrucje).map(function (k) { return [k, k]; }), "opcine", function (op) { return bo[op[0]] || 0; });

    var bm = brojac(bezSkupine("mjesta"), mjesto);
    var mjesta = Object.keys(bm).concat(stanje.mjesta.filter(function (m) { return !bm[m]; }))
      .sort(function (a, b) { return (bm[b] || 0) - (bm[a] || 0) || a.localeCompare(b, "hr"); });
    var vidljiva = svaMjesta ? mjesta : mjesta.filter(function (m, i) { return i < 12 || u(stanje.mjesta, m); });
    var opcijeM = vidljiva.map(function (m) { return [m, m]; });
    if (mjesta.length > vidljiva.length || svaMjesta) {
      opcijeM.push({ 0: "", 1: svaMjesta ? "Manje" : "Još " + (mjesta.length - vidljiva.length) + "…", ukljucen: false,
        klik: function () { svaMjesta = !svaMjesta; prikaziFiltere(); } });
    }
    cipovi("f-mjesto", opcijeM, "mjesta", function (op) { return op[0] ? bm[op[0]] || 0 : null; });

    var bc = bezSkupine("cijena");
    cipovi("f-cijena-brzo", CIJENE_BRZO.map(function (c) {
      var ukljucen = stanje.cmin === c[1] && stanje.cmax === c[2];
      return { 0: c[0], 1: c[0], ukljucen: ukljucen, od: c[1], do_: c[2], klik: function () {
        stanje.cmin = ukljucen ? "" : c[1]; stanje.cmax = ukljucen ? "" : c[2]; postaviPolja(); promijeni();
      } };
    }), null, function (op) {
      return bc.filter(function (n) { return n.cijena != null && (!op.od || n.cijena >= +op.od) && (!op.do_ || n.cijena <= +op.do_); }).length;
    });

    var stambeno = !stanje.vrste.length || u(stanje.vrste, "stan") || u(stanje.vrste, "kuca");
    document.getElementById("p-sobe").hidden = !stambeno && !stanje.sobe.length;
    var bs = brojac(bezSkupine("sobe"), function (n) { return sobeKos(n.sobe); });
    cipovi("f-sobe", SOBE, "sobe", function (op) { return bs[op[0]] || 0; });

    document.getElementById("p-kat").hidden = stanje.vrste.length && !u(stanje.vrste, "stan") && !stanje.kat.length;
    var bk = bezSkupine("kat").filter(function (n) { return n.vrsta === "stan"; });
    cipovi("f-kat", KAT, "kat", function (op) {
      return bk.filter(function (n) { return op[0] === "nezadnji" ? !n.zadnji_kat : katOk(n, op[0]); }).length;
    });

    var bz = brojac(bezSkupine("zn"), function (n) { return n.znacajke || []; });
    var zn = Object.keys(podaci.znacajke || {}).sort(function (a, b) { return (bz[b] || 0) - (bz[a] || 0); });
    cipovi("f-zn", zn.map(function (k) { return [k, podaci.znacajke[k]]; }), "zn", function (op) { return bz[op[0]] || 0; });

    var bb = bezSkupine("brzo");
    cipovi("f-brzo", BRZO, "brzo", function (op) { return bb.filter(function (n) { return brzoOk(n, op[0]); }).length; });
    prikaziZelje();
  }
  function promijeniZelju(k, w) {
    if (w) { zelje[k] = w; } else { delete zelje[k]; }
    pisi("nek_zelje", zelje);
    verzijaZelja++;
    if (imaZelja() && stanje.sort !== "moje" && stanje.sort !== "relevantno") {
      stanje.sort = "moje"; stanje.smjer = 0; pisi("nek_sort", ["moje", 0]);
    }
    if (!imaZelja() && stanje.sort === "moje" && !Object.keys(zelje).length) { stanje.sort = "ocjena"; pisi("nek_sort", ["ocjena", 0]); }
    promijeni();
  }
  function prikaziZelje() {
    var poz = ZELJE.concat(Object.keys(podaci.znacajke || {}).filter(function (k) { return k !== "adaptacija"; })
      .map(function (k) { return [k, podaci.znacajke[k]]; }));
    var k = document.getElementById("f-zelje");
    k.innerHTML = "";
    poz.forEach(function (z) {
      var w = zelje[z[0]] || 0;
      k.appendChild(el("button", { "class": "cip zelja", type: "button", "aria-pressed": w > 0 ? "true" : "false",
        title: w === 2 ? "Jako važno (klikni za isključiti)" : w === 1 ? "Važno (klikni za jako važno)" : "Klikni ako ti je važno",
        onclick: function () { promijeniZelju(z[0], w === 0 ? 1 : w === 1 ? 2 : 0); } },
        [z[1], w ? el("span", { "class": "zvjezdice", "aria-label": w === 2 ? "jako važno" : "važno", tekst: w === 2 ? "★★" : "★" }) : null]));
    });
    var iz = document.getElementById("f-izbjegavam");
    iz.innerHTML = "";
    IZBJEGAVAM.forEach(function (z) {
      var w = zelje[z[0]] || 0;
      iz.appendChild(el("button", { "class": "cip izbjegavam", type: "button", "aria-pressed": w < 0 ? "true" : "false",
        onclick: function () { promijeniZelju(z[0], w < 0 ? 0 : -1); } }, [z[1]]));
    });
    var oc = document.getElementById("f-zelje-ocisti");
    oc.hidden = !Object.keys(zelje).length;
  }
  function postaviPolja() {
    BROJEVI.concat(["trazi"]).forEach(function (k) {
      var i = document.getElementById("f-" + k);
      if (i !== document.activeElement) { i.value = stanje[k]; }
    });
    var s = document.getElementById("f-sort");
    var rel = s.querySelector("option[value=relevantno]");
    rel.disabled = rel.hidden = !stanje.trazi;
    s.value = stanje.sort;
    var sm = document.getElementById("f-smjer"), def = SORTOVI[stanje.sort];
    sm.hidden = !def.t;
    if (def.t) {
      var tekst = def.t[smjer() > 0 ? 0 : 1];
      sm.textContent = (smjer() > 0 ? "↑ " : "↓ ") + tekst;
      sm.setAttribute("aria-label", "Smjer sortiranja: " + tekst + ". Klikni za obrnuto.");
    }
  }

  // Aktivni filteri kao čipovi s ✕ iznad popisa
  function aktivni() {
    var a = [];
    function dodaj(tekst, makni) { a.push([tekst, makni]); }
    if (stanje.trazi) { dodaj("„" + stanje.trazi + "”", function () { stanje.trazi = ""; vratiSort(); }); }
    if (stanje.vrste.join() !== VRSTE_ZADANO) {
      dodaj(stanje.vrste.length ? stanje.vrste.map(function (v) { return VRSTE[v]; }).join(", ") : "Sve vrste",
        function () { stanje.vrste = VRSTE_ZADANO.split(","); });
    }
    stanje.opcine.forEach(function (o) { dodaj(o, function () { stanje.opcine = stanje.opcine.filter(function (x) { return x !== o; }); }); });
    stanje.mjesta.forEach(function (o) { dodaj(o, function () { stanje.mjesta = stanje.mjesta.filter(function (x) { return x !== o; }); }); });
    if (stanje.cmin || stanje.cmax) {
      dodaj(stanje.cmin && stanje.cmax ? tis(stanje.cmin) + "–" + tis(stanje.cmax) + " €" : stanje.cmin ? "od " + tis(stanje.cmin) + " €" : "do " + tis(stanje.cmax) + " €",
        function () { stanje.cmin = stanje.cmax = ""; });
    }
    stanje.sobe.forEach(function (s) { dodaj((s === "4" ? "4+" : s) + (s === "1" ? " soba" : " sobe"), function () { stanje.sobe = stanje.sobe.filter(function (x) { return x !== s; }); }); });
    stanje.kat.forEach(function (k) {
      dodaj(KAT.filter(function (x) { return x[0] === k; })[0][1], function () { stanje.kat = stanje.kat.filter(function (x) { return x !== k; }); });
    });
    stanje.zn.forEach(function (z) { dodaj((podaci.znacajke || {})[z] || z, function () { stanje.zn = stanje.zn.filter(function (x) { return x !== z; }); }); });
    stanje.brzo.forEach(function (b) {
      dodaj(BRZO.filter(function (x) { return x[0] === b; })[0][1], function () { stanje.brzo = stanje.brzo.filter(function (x) { return x !== b; }); });
    });
    [["pmin", "površina od ", " m²"], ["pmax", "površina do ", " m²"], ["zmin", "zemljište od ", " m²"], ["m2max", "do ", " €/m²"]].forEach(function (x) {
      if (stanje[x[0]]) { dodaj(x[1] + tis(stanje[x[0]]) + x[2], function () { stanje[x[0]] = ""; }); }
    });
    return a;
  }
  function vratiSort() {
    if (stanje.sort === "relevantno") {
      stanje.sort = sortPrijeTrazenja ? sortPrijeTrazenja[0] : "ocjena";
      stanje.smjer = sortPrijeTrazenja ? sortPrijeTrazenja[1] : 0;
    }
    sortPrijeTrazenja = null;
  }
  function prikaziAktivne() {
    var a = aktivni(), k = document.getElementById("aktivni");
    k.innerHTML = "";
    k.hidden = !a.length;
    a.forEach(function (x) {
      k.appendChild(el("button", { "class": "aktivan-cip", type: "button", "aria-label": "Makni filter " + x[0],
        onclick: function () { x[1](); postaviPolja(); promijeni(); } }, [x[0], el("span", { "aria-hidden": "true", tekst: "✕" })]));
    });
    if (a.length > 1) {
      k.appendChild(el("button", { "class": "ocisti-sve", type: "button", tekst: "Očisti sve", onclick: ocistiSve }));
    }
    var broj = a.filter(function (x) { return x[0].charAt(0) !== "„"; }).length;
    document.getElementById("gumb-filteri").textContent = "Filteri" + (broj ? " (" + broj + ")" : "");
  }
  function ocistiSve() {
    var pogled = stanje.pogled;
    var sort = stanje.sort === "relevantno" ? (sortPrijeTrazenja || ["ocjena", 0]) : [stanje.sort, stanje.smjer];
    stanje = prazno();
    stanje.pogled = pogled; stanje.sort = sort[0]; stanje.smjer = sort[1];
    sortPrijeTrazenja = null;
    document.getElementById("f-trazi").value = "";
    postaviPolja(); promijeni();
  }
  function bezPogleda(q) { var p = new URLSearchParams(q); p.delete("p"); return p.toString(); }

  // Spremljene pretrage (u pregledniku): link s filterima pod imenom
  function prikaziSpremljene() {
    var k = document.getElementById("spremljene");
    k.innerHTML = "";
    k.hidden = !pretrage.length;
    if (!pretrage.length) { return; }
    var sada = bezPogleda(location.search);
    k.appendChild(el("span", { "class": "oznaka", tekst: "Spremljeno:" }));
    pretrage.forEach(function (p, i) {
      k.appendChild(el("span", { "class": "spremljena" }, [
        el("button", { "class": "cip", type: "button", "aria-pressed": bezPogleda(p.q) === sada ? "true" : "false", tekst: p.naziv,
          onclick: function () {
            history.replaceState(null, "", location.pathname + (p.q ? "?" + p.q : ""));
            izUrla(p.q); postaviPolja(); prikazano = PO_STRANICI; prikazi(); naPonudu();
          } }),
        el("button", { "class": "makni", type: "button", "aria-label": "Obriši spremljenu pretragu " + p.naziv, tekst: "✕",
          onclick: function () { pretrage.splice(i, 1); pisi("nek_pretrage", pretrage); prikaziSpremljene(); } })
      ]));
    });
  }

  function prikazi() {
    if (!podaci) { return; }
    pretrazi();
    var osnovne = podaci.nekretnine.filter(function (n) { return prolazi(n); });
    var nav = document.getElementById("pogledi");
    nav.innerHTML = "";
    POGLEDI.forEach(function (p) {
      var broj = osnovne.filter(function (n) { return uPogledu(n, p[0]); }).length;
      nav.appendChild(el("button", { "class": "pogled", "aria-pressed": stanje.pogled === p[0] ? "true" : "false",
        onclick: function () { stanje.pogled = p[0]; promijeni(); naPonudu(); } },
        [p[1], el("span", { "class": "broj", tekst: String(broj) })]));
    });
    if (stanje.sort === "relevantno" && !rezultat) { vratiSort(); }
    var lista = osnovne.filter(function (n) { return uPogledu(n, stanje.pogled); })
      .sort(stanje.pogled === "rokovi" ? poRoku : usporedi);
    obavijestRokova(osnovne);
    document.querySelector(".sort-kontrole").hidden = stanje.pogled === "rokovi";
    var popis = document.getElementById("popis");
    popis.innerHTML = "";
    var naKarti = stanje.prikaz === "karta";
    popis.hidden = naKarti && lista.length > 0;
    document.getElementById("karta-blok").hidden = !naKarti || !lista.length;
    document.querySelectorAll("#prikaz button").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-prikaz") === stanje.prikaz));
    });
    if (naKarti) { if (lista.length) { prikaziKartu(lista); } }
    else { lista.slice(0, prikazano).forEach(function (n) { popis.appendChild(kartica(n)); }); }
    if (!lista.length) {
      var a = aktivni();
      popis.appendChild(el("div", { "class": "prazno" }, [
        el("p", { tekst: stanje.pogled === "novo" && !a.length ? "Sve si već pogledao. Novi oglasi stižu svakih sat vremena."
          : "Nema nekretnina za ove filtere." }),
        a.length ? el("button", { "class": "gumb sekundarni", type: "button", tekst: "Očisti filtere", onclick: ocistiSve }) : null
      ]));
    }
    var sazetak = document.getElementById("sazetak");
    sazetak.innerHTML = "";
    sazetak.appendChild(document.createTextNode(lista.length + " nekretnina"));
    if ((stanje.pogled === "favoriti" || stanje.pogled === "odbaceno") && Object.keys(oznake).length) {
      sazetak.appendChild(document.createTextNode(" · "));
      sazetak.appendChild(el("a", { href: "#", tekst: "podijeli moje oznake", onclick: function (e) {
        e.preventDefault(); podijeliOznake(e.currentTarget); } }));
    }
    if (stanje.pogled === "rokovi" && lista.length) {
      sazetak.appendChild(document.createTextNode(" · po roku · "));
      sazetak.appendChild(el("a", { href: "#", tekst: "svi u kalendar (.ics)", onclick: function (e) {
        e.preventDefault(); preuzmiIcs(lista, "rokovi-nekretnine.ics"); } }));
    }
    if (stanje.pogled === "novo" && lista.length) {
      sazetak.appendChild(document.createTextNode(" · "));
      sazetak.appendChild(el("a", { href: "#", tekst: "označi sve kao viđeno", onclick: function (e) {
        e.preventDefault(); lista.forEach(function (n) { vidjeno[n.id] = Date.now(); }); pisi("nek_vidjeno", vidjeno); prikazi();
      } }));
    }
    document.getElementById("f-prikazi").textContent = lista.length ? "Prikaži " + lista.length + " nekretnina" : "Nema rezultata";
    var jos = document.getElementById("jos");
    jos.hidden = naKarti || lista.length <= prikazano;
    jos.textContent = "Prikaži još (" + (lista.length - prikazano) + ")";
    postaviPolja();
    prikaziFiltere();
    prikaziAktivne();
    prikaziSpremljene();
    prikaziTrakuUsporedbe();
  }

  // ---------- rokovi dražbi i natječaja ----------
  function rokDatum(n) {
    if (!n.rok || !/^\d{4}-\d\d-\d\d/.test(n.rok)) { return null; }
    var cijeli = n.rok.length > 10 && n.rok.slice(11, 16) !== "00:00";
    return new Date(cijeli ? n.rok.replace(" ", "T") : n.rok.slice(0, 10) + "T23:59");
  }
  function danaDoRoka(n) {
    var d = rokDatum(n);
    if (!d) { return null; }
    var danas = new Date(); danas.setHours(0, 0, 0, 0);
    var dan = new Date(d); dan.setHours(0, 0, 0, 0);
    return d < new Date() ? -1 : Math.round((dan - danas) / 86400000);
  }
  function rokTekst(n) {
    var d = danaDoRoka(n), r = rokDatum(n);
    if (d == null || d < 0) { return ""; }
    var kad = d === 0 ? "rok danas" : d === 1 ? "rok sutra" : "rok za " + d + " dana";
    var datum = r.getDate() + ". " + (r.getMonth() + 1) + "." + (n.rok.length > 10 && n.rok.slice(11, 16) !== "00:00" ? " u " + n.rok.slice(11, 16) : "");
    return kad + " (" + datum + ")" + (n.jamcevina ? " · jamčevina " + eur(n.jamcevina) : "");
  }
  function poRoku(a, b) { return (rokDatum(a) || 0) - (rokDatum(b) || 0); }
  // .ics datoteka za kalendar na mobitelu (podsjetnik 2 dana i 2 sata prije)
  function ics(lista) {
    function esc_(t) { return String(t || "").replace(/[\\;,]/g, function (c) { return "\\" + c; }).replace(/\n/g, "\\n"); }
    function dt(d) { return d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0") +
      "T" + String(d.getHours()).padStart(2, "0") + String(d.getMinutes()).padStart(2, "0") + "00"; }
    var sada = new Date(), redovi = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//nekretnine-osijek//rokovi//HR", "CALSCALE:GREGORIAN"];
    lista.forEach(function (n) {
      var r = rokDatum(n);
      if (!r) { return; }
      var naslov = (n.nacin === "drazba" ? "Dražba" : n.nacin === "natjecaj" ? "Natječaj" : "Rok") + ": " +
        (VRSTE[n.vrsta] || "nekretnina") + ", " + (mjestoPrikaz(n) || n.opcina || "");
      var link = location.origin + location.pathname + "#n=" + encodeURIComponent(n.id);
      redovi.push("BEGIN:VEVENT", "UID:rok-" + n.id + "-" + n.rok.replace(/\D/g, "") + "@nekretnine-osijek", "DTSTAMP:" + dt(sada),
        "DTSTART:" + dt(r), "DTEND:" + dt(new Date(r.getTime() + 30 * 60000)), "SUMMARY:" + esc_(naslov),
        "DESCRIPTION:" + esc_([eur(n.cijena) || "cijena na upit", n.jamcevina ? "jamčevina " + eur(n.jamcevina) : "",
          n.naslov, "Izvor: " + n.url, "Pregled: " + link].filter(Boolean).join("\n")),
        "URL:" + link,
        "BEGIN:VALARM", "TRIGGER:-P2D", "ACTION:DISPLAY", "DESCRIPTION:" + esc_(naslov), "END:VALARM",
        "BEGIN:VALARM", "TRIGGER:-PT2H", "ACTION:DISPLAY", "DESCRIPTION:" + esc_(naslov), "END:VALARM",
        "END:VEVENT");
    });
    redovi.push("END:VCALENDAR");
    // RFC 5545: redak najviše 75 bajtova, nastavak počinje razmakom
    return redovi.map(function (r) {
      var dijelovi = [];
      while (r.length > 60) { dijelovi.push(r.slice(0, 60)); r = " " + r.slice(60); }
      dijelovi.push(r);
      return dijelovi.join("\r\n");
    }).join("\r\n");
  }
  function preuzmiIcs(lista, ime) {
    var b = new Blob([ics(lista)], { type: "text/calendar;charset=utf-8" });
    var a = el("a", { href: URL.createObjectURL(b), download: ime });
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function obavijestRokova(svi) {
    var k = document.getElementById("rokovi-obavijest");
    var uskoro = svi.filter(function (n) { var d = danaDoRoka(n); return n.aktivan && d != null && d >= 0 && d <= 7 && oznake[n.id] !== "odbaceno"; });
    k.innerHTML = "";
    k.hidden = !uskoro.length || stanje.pogled === "rokovi";
    if (k.hidden) { return; }
    k.appendChild(el("span", { tekst: uskoro.length === 1 ? "1 rok dražbe ili natječaja ističe u sljedećih 7 dana."
      : uskoro.length + " roka dražbi i natječaja ističu u sljedećih 7 dana." }));
    k.appendChild(el("button", { "class": "gumb sekundarni", type: "button", tekst: "Pogledaj rokove",
      onclick: function () { stanje.pogled = "rokovi"; promijeni(); naPonudu(); } }));
  }

  // ---------- dijeljenje oznaka (favoriti, odbačeno...) linkom ----------
  var KRATICE = { favorit: "f", za_obilazak: "o", kontaktirano: "k", odbaceno: "x" };
  function kodOznaka() {
    var po = {};
    Object.keys(oznake).forEach(function (id) { var k = KRATICE[oznake[id]]; if (k) { (po[k] = po[k] || []).push(id); } });
    return Object.keys(po).map(function (k) { return k + "." + po[k].join("."); }).join("~");
  }
  function dekodOznaka(kod) {
    var van = {}, obrnuto = {};
    Object.keys(KRATICE).forEach(function (o) { obrnuto[KRATICE[o]] = o; });
    String(kod || "").split("~").forEach(function (dio) {
      var d = dio.split("."), o = obrnuto[d[0]];
      if (o) { d.slice(1).forEach(function (id) { if (/^[\w-]{1,20}$/.test(id)) { van[id] = o; } }); }
    });
    return van;
  }
  function podijeliOznake(gumb) {
    var kod = kodOznaka();
    if (!kod) { gumb.textContent = "Još nemaš oznaka"; return; }
    var url = location.origin + location.pathname + "#oznake=" + kod;
    var broj = Object.keys(oznake).length;
    var tekst = "Moje oznake nekretnina (" + broj + "): otvori link i dodaj ih svojima.";
    if (navigator.share) { navigator.share({ title: "Nekretnine: moje oznake", text: tekst, url: url }).catch(function () {}); return; }
    var gotovo = function () { var t = gumb.textContent; gumb.textContent = "Link kopiran"; setTimeout(function () { gumb.textContent = t; }, 2000); };
    if (navigator.clipboard) { navigator.clipboard.writeText(url).then(gotovo, function () { prompt("Kopiraj link:", url); }); }
    else { prompt("Kopiraj link:", url); }
  }
  // Tuđe oznake se dodaju samo tamo gdje nemaš svoju; tvoje se nikad ne prepisuju.
  function ponudiUvozOznaka(kod) {
    var tude = dekodOznaka(kod), k = document.getElementById("uvoz-oznaka");
    var poznate = Object.keys(tude).filter(function (id) { return podaci.nekretnine.some(function (n) { return n.id === id; }); });
    var nove = poznate.filter(function (id) { return !oznake[id]; });
    var razlicite = poznate.filter(function (id) { return oznake[id] && oznake[id] !== tude[id]; });
    history.replaceState(null, "", location.pathname + location.search);
    k.innerHTML = "";
    k.hidden = false;
    if (!nove.length) {
      k.appendChild(el("span", { tekst: poznate.length ? "Sve oznake s ovog linka već imaš." : "Link ne sadrži oznake koje postoje u trenutnom popisu." }));
      k.appendChild(el("button", { "class": "gumb sekundarni", type: "button", tekst: "U redu", onclick: function () { k.hidden = true; } }));
      return;
    }
    var po = {};
    nove.forEach(function (id) { po[tude[id]] = (po[tude[id]] || 0) + 1; });
    k.appendChild(el("span", { tekst: "Netko ti je poslao oznake: " + Object.keys(po).map(function (o) { return OZNAKE[o].toLowerCase() + " " + po[o]; }).join(", ")
      + "." + (razlicite.length ? " Za " + razlicite.length + " imaš drukčiju oznaku i ona ostaje." : "") }));
    k.appendChild(el("button", { "class": "gumb", type: "button", tekst: "Dodaj k mojima", onclick: function () {
      nove.forEach(function (id) { oznake[id] = tude[id]; vidjeno[id] = vidjeno[id] || Date.now(); });
      pisi("nek_oznake", oznake); pisi("nek_vidjeno", vidjeno);
      k.innerHTML = ""; k.appendChild(el("span", { tekst: "Dodano " + nove.length + " oznaka." }));
      setTimeout(function () { k.hidden = true; }, 3000);
      stanje.pogled = "favoriti"; promijeni(); naPonudu();
    } }));
    k.appendChild(el("button", { "class": "gumb sekundarni", type: "button", tekst: "Odustani", onclick: function () { k.hidden = true; } }));
    naPonudu();
  }

  // ---------- usporedba 2-4 nekretnine ----------
  var usporedba = citaj("nek_usporedba", []);
  var MAX_USPOREDBA = 4;
  function uUsporedbi(id) { return usporedba.indexOf(id) >= 0; }
  function prebaciUsporedbu(id) {
    var i = usporedba.indexOf(id);
    if (i >= 0) { usporedba.splice(i, 1); }
    else {
      if (usporedba.length >= MAX_USPOREDBA) { usporedba.shift(); }  // najstarija izlazi
      usporedba.push(id);
    }
    pisi("nek_usporedba", usporedba);
  }
  function prikaziTrakuUsporedbe() {
    var t = document.getElementById("usporedba-traka");
    var postoje = usporedba.filter(function (id) { return podaci.nekretnine.some(function (n) { return n.id === id; }); });
    if (postoje.length !== usporedba.length) { usporedba = postoje; pisi("nek_usporedba", usporedba); }
    var filteriOtvoreni = !document.getElementById("filteri").hidden && !window.matchMedia("(min-width: 900px)").matches;
    t.hidden = !usporedba.length || filteriOtvoreni;
    t.innerHTML = "";
    if (t.hidden) { return; }
    t.appendChild(el("span", { "class": "usp-tekst", tekst: usporedba.length === 1 ? "Odaberi još jednu (⇄)"
      : "Usporedba: " + usporedba.length + (usporedba.length === MAX_USPOREDBA ? "/4" : "") }));
    t.appendChild(el("button", { "class": "gumb", type: "button", disabled: usporedba.length < 2, tekst: "Usporedi",
      onclick: function () { location.hash = "usporedi=" + usporedba.map(encodeURIComponent).join(","); } }));
    t.appendChild(el("button", { "class": "gumb sekundarni", type: "button", tekst: "Očisti", "aria-label": "Očisti usporedbu",
      onclick: function () { usporedba = []; pisi("nek_usporedba", usporedba); prikazi(); } }));
  }
  function tablicaUsporedbe(ids) {
    var dlg = document.getElementById("usporedba"), c = document.getElementById("usporedba-sadrzaj");
    var lista = ids.map(function (id) { return podaci.nekretnine.find(function (x) { return x.id === id; }); }).filter(Boolean);
    if (lista.length < 1) { if (dlg.open) { dlg.close(); } return; }
    var k = kalkPostavke();
    var calc = lista.map(function (n) { return izracun(n, k, jeNovogradnja(n)); });
    c.innerHTML = "";
    c.appendChild(el("div", { "class": "detalj-vrh" }, [
      el("h2", { tekst: "Usporedba (" + lista.length + ")" }),
      el("button", { "class": "gumb sekundarni", tekst: "Zatvori", onclick: zatvoriUsporedbu })
    ]));
    // [naziv, prikaz(n, i), broj(n, i) za isticanje najbolje, "min" | "max"]
    var redovi = [
      ["Cijena", function (n) { return eur(n.cijena) || "na upit"; }, function (n) { return n.cijena; }, "min"],
      ["Cijena po m²", function (n) { return n.eur_m2 ? tis(n.eur_m2) + " €" : "–"; }, function (n) { return n.eur_m2; }, "min"],
      ["Prema prosjeku", function (n) { return n.vs_prosjek == null ? "–" : (n.vs_prosjek > 0 ? "+" : "−") + Math.abs(n.vs_prosjek) + " %"; },
        function (n) { return n.vs_prosjek; }, "min"],
      ["Vrsta", function (n) { return VRSTE[n.vrsta] || n.vrsta; }],
      ["Mjesto", function (n) { return mjestoPrikaz(n) || n.opcina; }],
      ["Površina", function (n) { return m2(n.povrsina) || "–"; }, function (n) { return n.vrsta === "zemljiste" ? null : n.povrsina; }, "max"],
      ["Okućnica / zemljište", function (n) { return m2(n.zemljiste) || "–"; }, function (n) { return n.zemljiste; }, "max"],
      ["Sobe", function (n) { return n.sobe ? String(n.sobe).replace(".", ",") : "–"; }, function (n) { return n.sobe; }, "max"],
      ["Kat", function (n) { return katTekst(n) || "–"; }],
      ["Ima (iz opisa)", function (n) { return (n.znacajke || []).map(function (z) { return (podaci.znacajke || {})[z] || z; }).join(", ") || "–"; }],
      ["Na tržištu", function (n) { var d = danaNaTrzistu(n); return d == null ? "–" : d + " " + (d === 1 ? "dan" : "dana"); }],
      ["Pad cijene (30 dana)", function (n) { return n.pad ? "−" + String(n.pad.posto).replace(".", ",") + " %" : "–"; },
        function (n) { return n.pad ? n.pad.posto : null; }, "max"],
      ["Troškovi kupnje", function (n, i) { return calc[i] ? eur(calc[i].troskovi) : "–"; }, function (n, i) { return calc[i] && calc[i].troskovi; }, "min"],
      ["Gotovine odmah", function (n, i) { return calc[i] ? eur(calc[i].gotovina) : "–"; }, function (n, i) { return calc[i] && calc[i].gotovina; }, "min"],
      ["Rata (" + k.godina + " god., " + String(k.kamata).replace(".", ",") + " %)", function (n, i) { return calc[i] ? eur(calc[i].rata) + "/mj." : "–"; },
        function (n, i) { return calc[i] && calc[i].rata; }, "min"],
      ["Ocjena ponude", function (n) { return String(n.ocjena); }, function (n) { return n.ocjena; }, "max"]
    ];
    if (imaZelja()) {
      redovi.push(["Odgovara ti", function (n) { return mojaOcjena(n).ocjena + " %"; }, function (n) { return mojaOcjena(n).ocjena; }, "max"]);
    }
    redovi.push(
      ["Prodaje", function (n) { return n.nacin === "drazba" ? "dražba" : n.nacin === "natjecaj" ? "natječaj" : (n.agencija || (n.prodavac === "agencija" ? "agencija" : "privatno / nepoznato")); }],
      ["Rok", function (n) { return rokTekst(n) || "–"; }],
      ["Izvora", function (n) { return String(brojIzvora(n)); }]);
    var t = el("table", { "class": "usp-tablica" });
    var glava = el("tr", {}, [el("th", { scope: "col", "class": "usp-oznaka" }, [el("span", { "class": "vidljivo-sr", tekst: "Svojstvo" })])]
      .concat(lista.map(function (n) {
        return el("th", { scope: "col" }, [
          n.slika ? el("div", { "class": "usp-slika" }, [el("img", { src: n.slika, alt: "", loading: "lazy", referrerpolicy: "no-referrer",
            onerror: function (e) { e.currentTarget.parentNode.remove(); } })]) : null,
          el("a", { href: "#n=" + encodeURIComponent(n.id), "class": "usp-naslov", tekst: n.naslov || (VRSTE[n.vrsta] + ", " + mjestoPrikaz(n)) }),
          el("button", { "class": "usp-makni", type: "button", "aria-label": "Makni iz usporedbe", tekst: "Makni",
            onclick: function () { prebaciUsporedbu(n.id); var ost = usporedba.slice();
              if (ost.length) { location.hash = "usporedi=" + ost.map(encodeURIComponent).join(","); } else { zatvoriUsporedbu(); } } })
        ]);
      })));
    t.appendChild(el("thead", {}, [glava]));
    var tb = el("tbody");
    redovi.forEach(function (r) {
      var vrij = r[2] ? lista.map(function (n, i) { var v = r[2](n, i); return v == null || isNaN(v) ? null : v; }) : [];
      var poznate = vrij.filter(function (v) { return v != null; });
      var naj = poznate.length >= 2 && Math.min.apply(null, poznate) !== Math.max.apply(null, poznate)
        ? (r[3] === "min" ? Math.min.apply(null, poznate) : Math.max.apply(null, poznate)) : null;
      tb.appendChild(el("tr", {}, [el("th", { scope: "row", "class": "usp-oznaka", tekst: r[0] })].concat(lista.map(function (n, i) {
        return el("td", { "class": naj != null && vrij[i] === naj ? "najbolje" : "" }, [r[1](n, i)]);
      }))));
    });
    t.appendChild(tb);
    c.appendChild(el("div", { "class": "usp-omot" }, [t]));
    c.appendChild(el("p", { "class": "kalk-napomena usp-napomena", tekst: "Zeleno je najbolja vrijednost u retku. Troškovi i rata računaju se s postavkama iz kalkulatora " +
      "(učešće " + k.ucesce + " %, kamata " + String(k.kamata).replace(".", ",") + " %, " + k.godina + " god.), a mijenjaju se u detaljima nekretnine." }));
    c.appendChild(el("div", { "class": "usp-akcije" }, [
      el("button", { "class": "gumb sekundarni", type: "button", tekst: "Kopiraj link usporedbe", onclick: function (e) {
        var b = e.currentTarget, url = location.href;
        var gotovo = function () { b.textContent = "Link kopiran"; setTimeout(function () { b.textContent = "Kopiraj link usporedbe"; }, 2000); };
        if (navigator.clipboard) { navigator.clipboard.writeText(url).then(gotovo, function () { prompt("Kopiraj link:", url); }); } else { prompt("Kopiraj link:", url); }
      } })
    ]));
    if (!dlg.open) { dlg.showModal(); }
    c.scrollTop = 0;
  }
  function zatvoriUsporedbu() {
    if (location.hash) { history.replaceState(null, "", location.pathname + location.search); }
    var d = document.getElementById("usporedba");
    if (d.open) { d.close(); }
    prikazi();
  }

  // ---------- karta ----------
  var kartaUcitana = null, zadnjiOtisakKarte = "";
  function ucitaj(tag, atr) {
    return new Promise(function (ok, ne) {
      var e = document.createElement(tag);
      Object.keys(atr).forEach(function (k) { e[k] = atr[k]; });
      e.onload = ok; e.onerror = function () { ne(new Error("nije učitano: " + (atr.src || atr.href))); };
      document.head.appendChild(e);
    });
  }
  function ucitajKartu() {
    kartaUcitana = kartaUcitana || Promise.all([
      ucitaj("link", { rel: "stylesheet", href: "vendor/leaflet/leaflet.css" }),
      ucitaj("script", { src: "vendor/leaflet/leaflet.js" })
    ]).then(function () { return ucitaj("script", { src: "karta.js" }); });
    return kartaUcitana;
  }
  function medijan(niz) {
    if (!niz.length) { return null; }
    var s = niz.slice().sort(function (a, b) { return a - b; }), m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  function prikaziKartu(lista) {
    var g = {};
    lista.forEach(function (n) {
      var m = mjesto(n), kljuc = m || (n.opcina === "Osijek" ? "Osijek" : n.naselje || n.opcina || "");
      if (!kljuc) { return; }
      var s = g[kljuc] = g[kljuc] || { naziv: kljuc, rezerva: n.opcina, broj: 0, nepoznat: !m && n.opcina === "Osijek", cijene: [], m2: [] };
      s.broj++;
      if (n.cijena != null) { s.cijene.push(n.cijena); }
      if (n.vrsta === "stan" && n.eur_m2) { s.m2.push(n.eur_m2); }
    });
    var skupine = Object.keys(g).map(function (k) {
      var s = g[k], mc = medijan(s.cijene), mm = medijan(s.m2);
      s.redovi = [mc != null ? "Srednja cijena: " + eur(mc) : "", mm ? "Stanovi: " + tis(Math.round(mm)) + " €/m² (srednje)" : "",
        s.cijene.length ? "Najjeftinije: " + eur(Math.min.apply(null, s.cijene)) : ""].filter(Boolean);
      s.oznacen = u(stanje.mjesta, s.naziv);
      return s;
    });
    var otisak = skupine.map(function (s) { return s.naziv + s.broj; }).sort().join();
    var prilagodi = otisak !== zadnjiOtisakKarte;
    zadnjiOtisakKarte = otisak;
    var poruka = document.getElementById("karta-poruka");
    ucitajKartu().then(function () {
      poruka.hidden = true;
      window.NekKarta.crtaj(document.getElementById("karta"), skupine, {
        prilagodi: prilagodi,
        odaberi: function (naziv) { stanje.mjesta = [naziv]; stanje.prikaz = "popis"; promijeni(); naPonudu(); }
      });
    }, function (e) { poruka.hidden = false; poruka.textContent = "Karta se nije učitala (" + e.message + ")."; });
  }

  // ---------- kalkulator troškova kupnje ----------
  var KALK_ZADANO = { ucesce: 20, kamata: 3.2, godina: 30, provizija: 3, biljeznik: 500, prva: false };
  function kalkPostavke() { return Object.assign({}, KALK_ZADANO, citaj("nek_kalk", {})); }
  function jeAgencija(n) { return n.nacin === "oglas" && (n.prodavac === "agencija" || !!n.agencija); }
  function jeNovogradnja(n) { return (n.znacajke || []).indexOf("novogradnja") >= 0; }
  function izracun(n, k, novogradnja) {
    var c = n.cijena;
    if (!c) { return null; }
    var porez = novogradnja ? 0 : 0.03 * c;
    var provizija = jeAgencija(n) ? c * k.provizija / 100 * 1.25 : 0;
    var troskovi = porez + provizija + k.biljeznik;
    var ucesce = c * k.ucesce / 100, kredit = Math.max(0, c - ucesce);
    var r = k.kamata / 1200, mj = Math.max(1, Math.round(k.godina * 12));
    var rata = kredit ? (r ? kredit * r / (1 - Math.pow(1 + r, -mj)) : kredit / mj) : 0;
    return { c: c, porez: porez, provizija: provizija, troskovi: troskovi, ucesce: ucesce, kredit: kredit, rata: rata,
      kamate: rata * mj - kredit, gotovina: ucesce + troskovi };
  }
  function kalkulator(n) {
    var k = kalkPostavke();
    var agencija = jeAgencija(n);
    var stanje_k = { novogradnja: jeNovogradnja(n) };
    var omot = el("details", { "class": "kalk" });
    var sazetak = el("summary", {});
    var tijelo = el("div", { "class": "kalk-tijelo" });
    omot.appendChild(sazetak); omot.appendChild(tijelo);
    function polje(kljuc, natpis, korak, jedinica) {
      var i = el("input", { type: "number", inputmode: "decimal", step: korak, min: "0", value: String(k[kljuc]) });
      i.addEventListener("input", function () {
        var v = parseFloat(i.value.replace(",", "."));
        if (!isNaN(v)) { k[kljuc] = v; var spremi = {}; Object.keys(KALK_ZADANO).forEach(function (x) { spremi[x] = k[x]; }); pisi("nek_kalk", spremi); racunaj(); }
      });
      return el("label", { "class": "kalk-polje" }, [el("span", { tekst: natpis }), el("span", { "class": "kalk-unos" }, [i, el("small", { tekst: jedinica })])]);
    }
    function kvacica(natpis, vrijednost, promjena) {
      var i = el("input", { type: "checkbox" });
      i.checked = vrijednost;
      i.addEventListener("change", function () { promjena(i.checked); racunaj(); });
      return el("label", { "class": "kalk-kvacica" }, [i, el("span", { tekst: natpis })]);
    }
    var unos = el("div", { "class": "kalk-unosi" }, [
      polje("ucesce", "Učešće", "5", "%"), polje("kamata", "Kamata", "0.1", "%"), polje("godina", "Rok", "1", "god."),
      agencija ? polje("provizija", "Provizija agencije", "0.5", "% + PDV") : null,
      polje("biljeznik", "Bilježnik, odvjetnik, upis", "50", "€")
    ]);
    var kv = el("div", { "class": "kalk-kvacice" }, [
      kvacica("Novogradnja od investitora (PDV je u cijeni, nema poreza na promet)", stanje_k.novogradnja, function (v) { stanje_k.novogradnja = v; }),
      kvacica("Prva nekretnina i mlađi od 45 godina (mogući povrat poreza)", k.prva, function (v) { k.prva = v; var x = citaj("nek_kalk", {}); x.prva = v; pisi("nek_kalk", x); })
    ]);
    var rez = el("div", { "class": "kalk-rezultat" });
    tijelo.appendChild(unos); tijelo.appendChild(kv); tijelo.appendChild(rez);
    function red(natpis, iznos, cls) {
      return el("div", { "class": "kalk-red" + (cls ? " " + cls : "") }, [el("span", { tekst: natpis }), el("b", { tekst: iznos })]);
    }
    function racunaj() {
      rez.innerHTML = "";
      var x = izracun(n, k, stanje_k.novogradnja);
      if (!x) { sazetak.textContent = "Troškovi kupnje i kredit"; rez.appendChild(el("p", { tekst: "Cijena nije poznata, pa se troškovi ne mogu izračunati." })); return; }
      var c = x.c, porez = x.porez, provizija = x.provizija, troskovi = x.troskovi, ucesce = x.ucesce, kredit = x.kredit,
        rata = x.rata, kamate = x.kamate, gotovina = x.gotovina;
      sazetak.textContent = "Troškovi kupnje i kredit: ≈ " + eur(gotovina) + " odmah" + (kredit ? ", rata ≈ " + eur(rata) + "/mj." : "");
      rez.appendChild(red("Cijena", eur(c)));
      rez.appendChild(red(stanje_k.novogradnja ? "Porez na promet (ne plaća se, PDV je u cijeni)" : "Porez na promet nekretnina 3 %", eur(porez)));
      rez.appendChild(red(agencija ? "Provizija agencije " + String(k.provizija).replace(".", ",") + " % + PDV" : "Provizija agencije", agencija ? eur(provizija) : "nema"));
      rez.appendChild(red("Bilježnik, odvjetnik i upis (procjena)", eur(k.biljeznik)));
      rez.appendChild(red("Troškovi kupnje ukupno", eur(troskovi), "zbroj"));
      rez.appendChild(red("Učešće " + k.ucesce + " %", eur(ucesce)));
      rez.appendChild(red("Potrebno gotovine odmah", eur(gotovina), "glavno"));
      if (kredit) {
        rez.appendChild(red("Kredit", eur(kredit)));
        rez.appendChild(red("Mjesečna rata (" + k.godina + " god., " + String(k.kamata).replace(".", ",") + " %)", eur(rata), "glavno"));
        rez.appendChild(red("Ukupno kamata kroz cijeli rok", eur(kamate)));
      }
      if (k.prva) {
        var povrat = stanje_k.novogradnja ? 0.5 * c * 0.25 / 1.25 : 0.5 * porez;
        rez.appendChild(red(stanje_k.novogradnja ? "Mogući povrat 50 % PDV-a (naknadno)" : "Mogući povrat 50 % poreza (naknadno)", "− " + eur(povrat), "dobro"));
        rez.appendChild(el("p", { "class": "kalk-napomena", tekst: "Povrat za prvu stambenu nekretninu (mlađi od 45) vrijedi samo ako površina i cijena po m² ne prelaze propisane granice i ako se nekretnina 5 godina ne proda ni ne iznajmi. Zahtjev ide preko APN-a." }));
      }
      if (n.nacin !== "oglas") {
        rez.appendChild(el("p", { "class": "kalk-napomena", tekst: "Kod dražbe i natječaja: jamčevina" + (n.jamcevina ? " (" + eur(n.jamcevina) + ")" : "") +
          " uplaćuje se unaprijed, a kupovnina u kratkom roku nakon dražbe, pa kredit treba dogovoriti prije." }));
      }
      if (jeUdio(n)) { rez.appendChild(el("p", { "class": "kalk-napomena", tekst: "Ovo je suvlasnički udio: banke ga rijetko prihvaćaju kao zalog za kredit." })); }
      rez.appendChild(el("p", { "class": "kalk-napomena", tekst: "Orijentacijski izračun, nije financijski savjet. Porez na promet je 3 % tržišne vrijednosti (Porezna uprava). " +
        "Provizija ide po cjeniku agencije i duguje se samo uz potpisan ugovor o posredovanju (zakon od 7. 7. 2026.). " +
        "Banke traže najmanje 20 % učešća, a kamate su u 2026. oko 2,5–3,5 %. Točne uvjete provjeri u banci." }));
    }
    racunaj();
    return omot;
  }

  function detalj(id) {
    var dlg = document.getElementById("detalj");
    var n = podaci && podaci.nekretnine.find(function (x) { return x.id === id; });
    if (!n) { if (dlg.open) { dlg.close(); } return; }
    vidjeno[n.id] = Date.now(); pisi("nek_vidjeno", vidjeno);
    var o = oznake[n.id];
    var c = document.getElementById("detalj-sadrzaj");
    c.innerHTML = "";
    var prosjek = podaci.prosjeci[(n.naselje || "") + "|" + n.vrsta] || podaci.prosjeci[(n.opcina || "") + "|" + n.vrsta];
    var gdje = n.opcina === "Osijek" && n.kvart && n.kvart !== n.naselje ? "Osijek, " + n.kvart : (n.naselje || n.opcina || "");
    c.appendChild(el("div", { "class": "detalj-vrh" }, [
      el("h2", { tekst: (VRSTE[n.vrsta] || "Nekretnina") + ", " + gdje }),
      el("button", { "class": "gumb sekundarni", tekst: "Zatvori", onclick: zatvori })
    ]));
    var brojke = [
      [m2(n.povrsina) || "–", "površina"],
      [m2(n.zemljiste) || "–", "zemljište / okućnica"],
      [n.eur_m2 ? n.eur_m2.toLocaleString("hr-HR") + " €" : "–", "po m²"],
      [prosjek ? prosjek[0].toLocaleString("hr-HR") + " €" : "–", "prosjek po m² (" + (prosjek ? prosjek[1] + " oglasa" : "premalo oglasa") + ")"]
    ];
    if (n.vrsta === "stan" || n.vrsta === "kuca") { brojke.push([n.sobe ? String(n.sobe).replace(".", ",") : "–", "broj soba"]); }
    if (n.vrsta === "stan") { brojke.push([katTekst(n) || "–", "kat"]); }
    brojke.push([prije(n.od) || "–", "na tržištu"], [String(n.ocjena), "ocjena ponude"]);
    var zn = (n.znacajke || []).map(function (z) { return (podaci.znacajke || {})[z] || z; });
    var tijelo = el("div", { "class": "detalj-tijelo" }, [
      slika(n, false),
      el("div", { "class": "cijena" }, [eur(n.cijena) || "Cijena na upit", prosjekZnacka(n)]),
      el("div", { "class": "naslov-k" }, rezultat ? istakni(n.naslov, norm(n.naslov), 0, n.naslov.length) : [n.naslov]),
      el("div", { "class": "brojke" }, brojke.map(function (b) {
        return el("div", { "class": "brojka" }, [el("b", { tekst: b[0] }), el("span", { tekst: b[1] })]);
      })),
      zn.length ? el("div", { "class": "znacajke-detalj" }, [el("span", { "class": "oznaka", tekst: "U opisu piše:" })]
        .concat(zn.map(function (z) { return el("span", { "class": "zn", tekst: z }); }))) : null,
      n.nacin !== "oglas" ? el("div", { "class": "upozorenje", tekst: (n.nacin === "drazba" ? "Dražba" : "Javni natječaj")
        + (rokTekst(n) ? ", " + rokTekst(n).replace(/ · jamčevina.*/, "") : n.rok ? ", rok " + n.rok : "") + (n.jamcevina ? ", jamčevina " + eur(n.jamcevina) : "")
        + ". Uvjete, rokove i jamčevinu uvijek provjeri u izvornom dokumentu." }) : null,
      !n.aktivan ? el("div", { "class": "upozorenje", tekst: "Oglas više nije objavljen (vjerojatno prodano ili povučeno)." }) : null,
      jeUdio(n) ? el("div", { "class": "upozorenje", tekst: n.predmet === "udio?"
        ? "Možda se prodaje samo suvlasnički udio, a ne cijela nekretnina. Provjeri u oglasu."
        : "Prodaje se suvlasnički udio, a ne cijela nekretnina. Cijena je za taj dio." }) : null,
      imaZelja() ? (function () {
        var m = mojaOcjena(n);
        return el("div", { "class": "moje-detalj" }, [el("b", { tekst: "Odgovara ti " + m.ocjena + " %" }),
          m.zasto.length ? el("span", { tekst: " · " + m.zasto.join(", ") }) : null]);
      })() : null,
      n.cijene && n.cijene.length > 1 ? el("div", {}, [el("b", { tekst: "Povijest cijene" }),
        el("ul", { "class": "povijest-cijene" }, n.cijene.slice().reverse().map(function (c) {
          return el("li", {}, [el("span", { tekst: c[0].split("-").reverse().join(".") + "." }), el("span", { tekst: eur(c[1]) })]);
        }))]) : null,
      kalkulator(n),
      el("div", { "class": "akcije-velike" }, Object.keys(OZNAKE).map(function (k) {
        return el("button", { "class": "gumb", "aria-pressed": o === k ? "true" : "false", tekst: OZNAKE[k],
          onclick: function () { postaviOznaku(n.id, k); detalj(n.id); prikazi(); } });
      })),
      el("ul", { "class": "izvori-popis" }, n.izvori.map(function (i) {
        return el("li", {}, [el("a", { href: i.url, target: "_blank", rel: "noopener noreferrer" }, [
          el("span", { tekst: "Otvori na: " + i.naziv }),
          el("span", { "class": i.aktivan ? "" : "nestao", tekst: i.aktivan ? eur(i.cijena) : "nestao" })])]);
      })),
      el("button", { "class": "gumb sekundarni", type: "button", "aria-pressed": uUsporedbi(n.id) ? "true" : "false",
        tekst: uUsporedbi(n.id) ? "U usporedbi (makni)" : "Dodaj u usporedbu",
        onclick: function () { prebaciUsporedbu(n.id); detalj(n.id); prikaziTrakuUsporedbe(); } }),
      rokDatum(n) && danaDoRoka(n) >= 0 ? el("button", { "class": "gumb sekundarni", type: "button", tekst: "Dodaj rok u kalendar (.ics)",
        onclick: function () { preuzmiIcs([n], "rok-" + n.id + ".ics"); } }) : null,
      n.telefon ? el("a", { "class": "gumb sekundarni", href: "tel:+" + n.telefon.replace(/^\+/, ""), tekst: "Nazovi +" + n.telefon.replace(/^\+/, "") }) : null,
      el("a", { "class": "gumb sekundarni", target: "_blank", rel: "noopener noreferrer",
        href: "https://www.google.com/maps/search/" + encodeURIComponent([n.kvart, n.naselje, n.opcina].filter(function (v, i, a) {
          return v && a.indexOf(v) === i; }).join(", ") + ", Hrvatska"),
        tekst: "Pogledaj mjesto na karti" }),
      n.agencija || n.prodavac ? el("p", { "class": "razlozi", tekst: "Prodavač: " + [n.prodavac, n.agencija].filter(Boolean).join(", ") }) : null,
      n.razlozi ? el("p", { "class": "razlozi", tekst: "Zašto ova ocjena: " + n.razlozi }) : null,
      n.opis ? el("div", { "class": "opis" }, rezultat ? istakni(n.opis, n._no, 0, n.opis.length) : [n.opis]) : null
    ]);
    c.appendChild(tijelo);
    if (!dlg.open) { dlg.showModal(); }
    c.scrollTop = 0;
  }
  function zatvori() {
    if (location.hash) { history.replaceState(null, "", location.pathname + location.search); }
    var dlg = document.getElementById("detalj");
    if (dlg.open) { dlg.close(); }
    prikazi();
  }
  function iz_hasha() {
    var oz = location.hash.match(/oznake=([^&]+)/);
    if (oz) { ponudiUvozOznaka(decodeURIComponent(oz[1])); return; }
    var u_ = location.hash.match(/usporedi=([^&]+)/);
    if (u_) {
      var d0 = document.getElementById("detalj"); if (d0.open) { d0.close(); }
      var ids = decodeURIComponent(u_[1]).split(",").filter(Boolean).slice(0, MAX_USPOREDBA);
      if (ids.join() !== usporedba.join()) { usporedba = ids; pisi("nek_usporedba", usporedba); }
      tablicaUsporedbe(ids); return;
    }
    var du = document.getElementById("usporedba"); if (du.open && /n=/.test(location.hash)) { du.close(); }
    var m = location.hash.match(/(?:^#|&)n=([^&]+)/);
    if (m) { detalj(decodeURIComponent(m[1])); } else { var d = document.getElementById("detalj"); if (d.open) { d.close(); } }
  }

  // ---------- prijedlozi dok tipkaš ----------
  var prijedlozi = [], aktivniPrijedlog = -1;
  function kandidati() {
    var c = [];
    var bm = brojac(podaci.nekretnine.filter(function (n) { return n.aktivan; }), mjesto);
    Object.keys(bm).forEach(function (m) { c.push({ tip: "mjesto", v: m, tekst: m, opis: "kvart / naselje", broj: bm[m] }); });
    Object.keys(podaci.podrucje).forEach(function (o) { c.push({ tip: "opcina", v: o, tekst: o, opis: "općina" }); });
    Object.keys(podaci.znacajke || {}).forEach(function (z) { c.push({ tip: "zn", v: z, tekst: podaci.znacajke[z], opis: "ima" }); });
    Object.keys(VRSTE).forEach(function (v) { c.push({ tip: "vrsta", v: v, tekst: VRSTE[v], opis: "vrsta" }); });
    SOBE_RIJECI.forEach(function (s) { c.push({ tip: "sobe", v: String(s[1]), tekst: s[0], opis: "broj soba" }); });
    var ag = brojac(podaci.nekretnine.filter(function (n) { return n.aktivan; }), function (n) { return n.agencija; });
    Object.keys(ag).forEach(function (a) { c.push({ tip: "tekst", v: a, tekst: a, opis: "agencija", broj: ag[a] }); });
    c.forEach(function (x) { x.n = norm(x.tekst); });
    return c;
  }
  var sviKandidati = null;
  // Završeci upita (zadnja 1-3 riječi): "kuca donji gr" -> ["gr", "donji gr", "kuca donji gr"]
  function zavrseci(q) {
    if (/\s$/.test(q)) { return []; }
    var w = norm(q).trim().split(/\s+/).filter(Boolean), van = [];
    for (var k = w.length - 1; k >= Math.max(0, w.length - 3); k--) { van.push(w.slice(k).join(" ")); }
    return van.filter(function (t) { return t.length >= 2; });
  }
  function pogodak(kn, zav) {
    for (var i = zav.length - 1; i >= 0; i--) {
      if (kn.indexOf(zav[i]) === 0) { return { duljina: zav[i].length, pocetak: true, k: i }; }
      if (kn.indexOf(" " + zav[i]) > 0) { return { duljina: zav[i].length, pocetak: false, k: i }; }
    }
    return null;
  }
  function predlozi() {
    var input = document.getElementById("f-trazi"), lista = document.getElementById("prijedlozi");
    var zav = zavrseci(input.value);
    prijedlozi = [];
    if (zav.length) {
      sviKandidati = sviKandidati || kandidati();
      var vec = { mjesto: stanje.mjesta, opcina: stanje.opcine, zn: stanje.zn, sobe: stanje.sobe };
      prijedlozi = sviKandidati.map(function (k) {
        return vec[k.tip] && u(vec[k.tip], k.v) ? null : { k: k, p: pogodak(k.n, zav) };
      }).filter(function (x) { return x && x.p; }).sort(function (a, b) {
        return (b.p.duljina - a.p.duljina) || (b.p.pocetak - a.p.pocetak) || ((b.k.broj || 0) - (a.k.broj || 0));
      }).slice(0, 8).map(function (x) { x.k.rijeci = x.p.k; return x.k; });
    }
    aktivniPrijedlog = -1;
    lista.innerHTML = "";
    prijedlozi.forEach(function (p, i) {
      lista.appendChild(el("li", { role: "option", id: "prijedlog-" + i, "aria-selected": "false",
        onmousedown: function (e) { e.preventDefault(); odaberi(i); } },
        [el("span", { tekst: p.tekst }), el("small", { tekst: p.opis + (p.broj ? " · " + p.broj : "") })]));
    });
    lista.hidden = !prijedlozi.length;
    input.setAttribute("aria-expanded", String(!!prijedlozi.length));
  }
  function zatvoriPrijedloge() {
    var lista = document.getElementById("prijedlozi");
    lista.hidden = true; prijedlozi = [];
    document.getElementById("f-trazi").setAttribute("aria-expanded", "false");
    document.getElementById("f-trazi").removeAttribute("aria-activedescendant");
  }
  // Odabir mjesta/značajke postavlja FILTER (točnije od pretrage teksta); agencija ide u pretragu kao fraza.
  function odaberi(i) {
    var p = prijedlozi[i], input = document.getElementById("f-trazi");
    if (!p) { return; }
    var w = input.value.trim().split(/\s+/);
    var bez = w.slice(0, Math.max(0, w.length - 1 - (p.rijeci || 0))).join(" ");
    if (p.tip === "tekst") { stanje.trazi = (bez + " \"" + p.v + "\"").trim(); }
    else {
      stanje.trazi = bez;
      if (p.tip === "mjesto") { stanje.mjesta.push(p.v); }
      if (p.tip === "opcina") { stanje.opcine.push(p.v); }
      if (p.tip === "zn") { stanje.zn.push(p.v); }
      if (p.tip === "sobe") { stanje.sobe.push(p.v); }
      if (p.tip === "vrsta") { stanje.vrste = [p.v]; }
    }
    if (!stanje.trazi) { vratiSort(); } else if (stanje.sort !== "relevantno") { sortPrijeTrazenja = [stanje.sort, stanje.smjer]; stanje.sort = "relevantno"; stanje.smjer = 0; }
    input.value = stanje.trazi;
    zatvoriPrijedloge();
    promijeni();
  }

  // ---------- kontrole ----------
  function postaviKontrole() {
    var odgoda;
    var input = document.getElementById("f-trazi");
    input.addEventListener("input", function () {
      var bilo = stanje.trazi;
      stanje.trazi = input.value.trim();
      if (stanje.trazi && !bilo && stanje.sort !== "relevantno") {
        sortPrijeTrazenja = [stanje.sort, stanje.smjer]; stanje.sort = "relevantno"; stanje.smjer = 0;
      }
      if (!stanje.trazi) { vratiSort(); }
      predlozi();
      clearTimeout(odgoda);
      odgoda = setTimeout(promijeni, 120);
    });
    input.addEventListener("keydown", function (e) {
      var lista = document.getElementById("prijedlozi");
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (!prijedlozi.length) { return; }
        e.preventDefault();
        aktivniPrijedlog = (aktivniPrijedlog + (e.key === "ArrowDown" ? 1 : -1) + prijedlozi.length + 1) % (prijedlozi.length + 1);
        if (aktivniPrijedlog === prijedlozi.length) { aktivniPrijedlog = -1; }
        Array.prototype.forEach.call(lista.children, function (li, i) { li.setAttribute("aria-selected", String(i === aktivniPrijedlog)); });
        if (aktivniPrijedlog >= 0) { input.setAttribute("aria-activedescendant", "prijedlog-" + aktivniPrijedlog); }
        else { input.removeAttribute("aria-activedescendant"); }
      } else if (e.key === "Enter") {
        if (aktivniPrijedlog >= 0) { e.preventDefault(); odaberi(aktivniPrijedlog); }
        else { zatvoriPrijedloge(); clearTimeout(odgoda); promijeni(); input.blur(); naPonudu(); }
      } else if (e.key === "Escape") { zatvoriPrijedloge(); }
    });
    input.addEventListener("blur", function () { setTimeout(zatvoriPrijedloge, 150); });
    input.addEventListener("focus", predlozi);

    BROJEVI.forEach(function (k) {
      var i = document.getElementById("f-" + k);
      i.addEventListener("input", function () { stanje[k] = i.value.trim(); clearTimeout(odgoda); odgoda = setTimeout(promijeni, 200); });
    });
    var s = document.getElementById("f-sort");
    s.addEventListener("change", function () {
      stanje.sort = s.value; stanje.smjer = 0;
      if (stanje.sort !== "relevantno") { sortPrijeTrazenja = null; pisi("nek_sort", [stanje.sort, 0]); }
      promijeni(); naPonudu();
    });
    document.getElementById("f-smjer").addEventListener("click", function () {
      stanje.smjer = -smjer();
      if (stanje.smjer === SORTOVI[stanje.sort].smjer) { stanje.smjer = 0; }
      pisi("nek_sort", [stanje.sort, stanje.smjer]);
      promijeni();
    });
    document.getElementById("f-ocisti").addEventListener("click", ocistiSve);
    document.getElementById("podijeli-oznake").addEventListener("click", function (e) { e.preventDefault(); podijeliOznake(e.currentTarget); });
    document.querySelectorAll("#prikaz button").forEach(function (b) {
      b.addEventListener("click", function () { stanje.prikaz = b.getAttribute("data-prikaz"); promijeni(); });
    });
    document.getElementById("f-podijeli").addEventListener("click", function (e) {
      var b = e.currentTarget;
      var gotovo = function () { b.textContent = "Link kopiran"; setTimeout(function () { b.textContent = "Kopiraj link s filterima"; }, 2000); };
      if (navigator.clipboard) { navigator.clipboard.writeText(location.href).then(gotovo, function () { prompt("Kopiraj link:", location.href); }); }
      else { prompt("Kopiraj link:", location.href); }
    });
    document.getElementById("f-spremi").addEventListener("submit", function (e) {
      e.preventDefault();
      var ime = document.getElementById("f-naziv"), naziv = ime.value.trim() || "Pretraga " + (pretrage.length + 1);
      var q = bezPogleda(uUrl());
      pretrage = pretrage.filter(function (p) { return p.naziv !== naziv; });
      pretrage.push({ naziv: naziv, q: q });
      pisi("nek_pretrage", pretrage);
      ime.value = "";
      prikaziSpremljene();
    });
    var g = document.getElementById("gumb-filteri");
    var f = document.getElementById("filteri");
    if (window.matchMedia("(min-width: 900px)").matches) { f.hidden = false; g.setAttribute("aria-expanded", "true"); }
    g.addEventListener("click", function () {
      f.hidden = !f.hidden; g.setAttribute("aria-expanded", String(!f.hidden));
      if (!f.hidden) { f.scrollIntoView({ block: "nearest" }); }
    });
    document.getElementById("f-prikazi").addEventListener("click", function () {
      if (!window.matchMedia("(min-width: 900px)").matches) { f.hidden = true; g.setAttribute("aria-expanded", "false"); }
      var m = document.querySelector("main");
      window.scrollTo(0, m.getBoundingClientRect().top + window.scrollY - document.getElementById("ponuda").offsetHeight);
    });
  }

  // ---------- start ----------
  izUrla();
  document.getElementById("jos").addEventListener("click", function () { prikazano += PO_STRANICI; prikazi(); });
  document.getElementById("usporedba").addEventListener("close", function () {
    if (/usporedi=/.test(location.hash)) { history.replaceState(null, "", location.pathname + location.search); }
    prikazi();
  });
  document.getElementById("detalj").addEventListener("close", function () {
    if (location.hash) { history.replaceState(null, "", location.pathname + location.search); }
  });
  window.addEventListener("hashchange", iz_hasha);
  fetch("podaci.json?t=" + Math.floor(Date.now() / 300000), { cache: "no-cache" })
    .then(function (r) { if (!r.ok) { throw new Error("HTTP " + r.status); } return r.json(); })
    .then(function (d) {
      podaci = d;
      d.nekretnine.forEach(function (n) {
        n.znacajke = n.znacajke || [];
        n.naslov = n.naslov || "";
        n.opis = n.opis || "";
        var zn = n.znacajke.map(function (z) { return (d.znacajke || {})[z] || ""; }).join(" ");
        n._tn = norm([n.naslov, mjestoPrikaz(n), n.naselje, n.kvart, n.opcina, VRSTE[n.vrsta], sobeTekst(n.sobe)].join(" "));
        n._no = norm(n.opis);
        n._to = n._no + " " + norm([n.agencija, n.prodavac, zn, katTekst(n), n.izvori.map(function (i) { return i.naziv; }).join(" ")].join(" "));
      });
      var mj = {};
      d.nekretnine.forEach(function (n) { var m = norm(mjesto(n)); if (m.indexOf(" ") > 0) { mj[m] = 1; } });
      VISE_RIJECI = Object.keys(mj).concat(["jug ii", "nova gradnja", "obiteljska kuca", "poslovni prostor"])
        .sort(function (a, b) { return b.length - a.length; });
      var aktivnih = d.nekretnine.filter(function (n) { return n.aktivan; }).length;
      var brojIzv = (d.skupine_izvora || []).reduce(function (a, g) { return a + g.izvori.length; }, 0) || d.izvori.length;
      document.getElementById("hb-nek").textContent = aktivnih.toLocaleString("hr-HR");
      document.getElementById("hb-izv").textContent = String(brojIzv);
      document.getElementById("hb-osv").textContent = prijeKratko(d.generirano);
      var los = d.izvori.filter(function (i) { return !i.radi; }).map(function (i) { return i.naziv; });
      document.getElementById("stanje").textContent = "Osvježeno " + prije(d.generirano) + " (" + d.generirano.slice(0, 16)
        + "), " + aktivnih + " aktivnih nekretnina, " + brojIzv + " izvora"
        + (los.length ? "; trenutno ne radi: " + los.join(", ") : "") + ".";
      if (!citaj("nek_vidjeno_init", false)) {
        // prvi posjet: ne prikazuj 800 "novih"; novo je ono što se pojavi od danas
        d.nekretnine.forEach(function (n) { vidjeno[n.id] = 1; });
        pisi("nek_vidjeno", vidjeno); pisi("nek_vidjeno_init", true);
      }
      rangiraj(d.nekretnine);
      document.getElementById("f-zelje-ocisti").addEventListener("click", function () {
        zelje = {}; pisi("nek_zelje", zelje); verzijaZelja++;
        if (stanje.sort === "moje") { stanje.sort = "ocjena"; stanje.smjer = 0; pisi("nek_sort", ["ocjena", 0]); }
        promijeni();
      });
      postaviKontrole();
      prikazi();
      iz_hasha();
    })
    .catch(function (e) {
      document.getElementById("sazetak").textContent = "Podaci se nisu učitali (" + e.message + "). Pokušaj osvježiti stranicu.";
      if (window.console) { console.error(e); }
    });
})();
