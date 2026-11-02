# Páginas oficiales para verificar el artículo del referéndum de Alberta (ART-2026-028)
# de la Edición 01 (octubre de 2026). Solo lectura; se ejecuta en GitHub Actions.
E = "https://www.elections.ab.ca"
R = "https://officialresults.elections.ab.ca/orEDResultsReferendum2026.cfm?EventId="
PAGINAS = [
    ("Elections Alberta: comunicado resultados oficiales 29-10-2026", E + "/resources/media/news-releases/2026-10-29-2/"),
    ("Elections Alberta: página de resultados del referéndum", E + "/elections/referendum/referendum-results/"),
    ("Elections Alberta: actualización conteo no oficial 24-10-2026", E + "/resources/media/news-releases/2026-10-24/"),
    ("Elections Alberta: proceso de resultados no oficiales 19-10-2026", E + "/resources/media/news-releases/2026-10-19-2/"),
] + [("Resultados oficiales EventId 2026%02d" % i, R + "2026%02d" % i) for i in range(1, 11)]
