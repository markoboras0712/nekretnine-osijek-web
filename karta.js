/* Karta nekretnina po kvartu / naselju (Leaflet + OpenStreetMap). Učitava se tek kad se otvori prikaz karte.
   Oglasi gotovo nikad ne navode adresu, pa je položaj središte kvarta ili naselja, ne točna lokacija. */
(function () {
  "use strict";
  // Koordinate iz OpenStreetMap (Nominatim), studeni 2026. Centar = Trg Ante Starčevića.
  var KOORD = {
    "Osijek": [45.55488, 18.69537], "Centar": [45.56154, 18.67682], "Tvrđa": [45.5605, 18.69578],
    "Tvrđavica": [45.57327, 18.68011], "Gornji grad": [45.5578, 18.6712], "Donji grad": [45.55568, 18.71956],
    "Novi grad": [45.54961, 18.70004], "Industrijska četvrt": [45.54666, 18.67917], "Jug 2": [45.5459, 18.71722],
    "Jug 1": [45.54773, 18.70852], "Sjenjak": [45.55172, 18.69838], "Retfala": [45.56192, 18.64772],
    "Cvjetno naselje": [45.53407, 18.63096], "Vatrogasno naselje": [45.54627, 18.7012],
    "Bosutsko naselje": [45.54646, 18.67514], "Zeleno polje": [45.55242, 18.73057], "Uske njive": [45.54241, 18.70153],
    "Bikara": [45.54655, 18.7292], "Pampas": [45.56991, 18.64879], "Tenja": [45.50171, 18.74461],
    "Josipovac": [45.57855, 18.58658], "Višnjevac": [45.56597, 18.61983], "Sarvaš": [45.52572, 18.83837],
    "Briješće": [45.52477, 18.62716], "Brijest": [45.52133, 18.67629], "Podravlje": [45.56255, 18.71109],
    "Klisa": [45.47535, 18.83319], "Nemetin": [45.53979, 18.77521],
    "Antunovac": [45.48304, 18.69459], "Ivanovac": [45.48255, 18.64267],
    "Bilje": [45.60398, 18.74376], "Kopačevo": [45.6001, 18.78714], "Lug": [45.66111, 18.77858],
    "Vardarac": [45.62369, 18.77047], "Podunavlje": [45.6304, 18.8135], "Tikveš": [45.67154, 18.84506],
    "Zlatna Greda": [45.72128, 18.86511],
    "Čepin": [45.5236, 18.57372], "Beketinci": [45.45704, 18.48108], "Čepinski Martinci": [45.51355, 18.4723],
    "Čokadinci": [45.50075, 18.44194], "Livana": [45.52995, 18.61416], "Ovčara": [45.50716, 18.56831],
    "Petrijevci": [45.61417, 18.53496], "Satnica": [45.61438, 18.48949],
    "Valpovo": [45.65913, 18.41788], "Ladimirevci": [45.62541, 18.44508], "Harkanovci": [45.58922, 18.33453],
    "Ivanovci": [45.62149, 18.38501], "Marjančaci": [45.63283, 18.39444], "Nard": [45.66259, 18.484],
    "Šag": [45.63927, 18.46682], "Zelčin": [45.61447, 18.36577]
  };
  var karta = null, sloj = null, prviPut = true;

  function el(tag, cls, tekst) {
    var e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (tekst != null) { e.textContent = tekst; }
    return e;
  }

  // Kvartovi užeg grada: kad je karta oddaljena, spoje se u jedan krug "Osijek" (inače se preklapaju)
  var GRAD = ["Osijek", "Centar", "Tvrđa", "Tvrđavica", "Gornji grad", "Donji grad", "Novi grad", "Industrijska četvrt",
    "Jug 2", "Jug 1", "Sjenjak", "Retfala", "Cvjetno naselje", "Vatrogasno naselje", "Bosutsko naselje", "Zeleno polje",
    "Uske njive", "Bikara", "Pampas", "Podravlje"];
  var ZOOM_GRAD = 12.5;
  var zadnje = null;

  function mjehur(L, k, broj, max, klase, naslov, zoom) {
    var f = zoom >= 14 ? 1.15 : zoom >= 13 ? 1 : 0.85;
    var r = Math.round((12 + 20 * Math.sqrt(broj / max)) * f);
    var ikona = L.divIcon({
      className: "mjehur-omot",
      html: "<div class=\"mjehur" + klase + "\" style=\"width:" + (2 * r) + "px;height:" + (2 * r) + "px\"><b>" + (+broj) + "</b></div>",
      iconSize: [2 * r, 2 * r], iconAnchor: [r, r]
    });
    // manji krugovi iznad većih, da se svi mogu kliknuti
    return L.marker(k, { icon: ikona, title: naslov, keyboard: true, riseOnHover: true,
      zIndexOffset: Math.round(1000 * (1 - broj / max)) });
  }

  function iscrtaj() {
    var L = window.L, skupine = zadnje.skupine, opcije = zadnje.opcije, zoom = karta.getZoom();
    sloj.clearLayers();
    var spoji = zoom < ZOOM_GRAD;
    var vidljive = skupine.filter(function (s) { return KOORD[s.naziv] || KOORD[s.rezerva]; });
    var grad = spoji ? vidljive.filter(function (s) { return GRAD.indexOf(s.naziv) >= 0; }) : [];
    var ostale = vidljive.filter(function (s) { return grad.indexOf(s) < 0; });
    var ukGrad = grad.reduce(function (a, s) { return a + s.broj; }, 0);
    var max = Math.max.apply(null, ostale.map(function (s) { return s.broj; }).concat([ukGrad, 1]));
    if (ukGrad) {
      var m = mjehur(L, KOORD.Osijek, ukGrad, max, grad.some(function (s) { return s.oznacen; }) ? " oznacen" : "",
        "Osijek (grad): " + ukGrad + " — klikni za kvartove", zoom);
      m.on("click", function () { karta.setView(KOORD.Osijek, 13.5); });
      m.addTo(sloj);
    }
    ostale.forEach(function (s) {
      var k = KOORD[s.naziv] || KOORD[s.rezerva];
      var m = mjehur(L, k, s.broj, max, (s.oznacen ? " oznacen" : "") + (s.nepoznat ? " nepoznat" : ""), s.naziv + ": " + s.broj, zoom);
      var p = el("div", "karta-popup");
      p.appendChild(el("b", null, s.nepoznat ? "Osijek, kvart nije naveden" : s.naziv));
      p.appendChild(el("div", null, s.broj + " nekretnina"));
      s.redovi.forEach(function (r) { p.appendChild(el("div", "karta-red", r)); });
      if (!s.nepoznat) {
        var b = el("button", "gumb", "Prikaži popis");
        b.type = "button";
        b.addEventListener("click", function () { opcije.odaberi(s.naziv); });
        p.appendChild(b);
      }
      m.bindPopup(p, { maxWidth: 260 });
      m.addTo(sloj);
    });
  }

  function crtaj(kontejner, skupine, opcije) {
    var L = window.L;
    if (!karta) {
      karta = L.map(kontejner, { scrollWheelZoom: false, zoomSnap: 0.5, attributionControl: true });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18, attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a>"
      }).addTo(karta);
      sloj = L.layerGroup().addTo(karta);
      karta.setView([45.56, 18.66], 11);
      karta.on("zoomend", function () { if (zadnje) { iscrtaj(); } });
    }
    karta.invalidateSize();
    zadnje = { skupine: skupine, opcije: opcije };
    var granice = skupine.map(function (s) { return KOORD[s.naziv] || KOORD[s.rezerva]; }).filter(Boolean);
    if ((prviPut || opcije.prilagodi) && granice.length) {
      prviPut = false;
      karta.fitBounds(granice, { padding: [30, 30], maxZoom: 14, animate: false });
    }
    iscrtaj();
  }

  window.NekKarta = { crtaj: crtaj, KOORD: KOORD };
})();
