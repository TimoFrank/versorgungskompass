# Übernahme und Updates

Stand: 13. November 2026

Das GitHub-Repository [versorgungskompass](https://github.com/TimoFrank/versorgungskompass) stellt den Quellstand bereit. Nach dem geprüften Import führt das institutionelle GitLab den gematik-Betriebsstand.

## Vorbereitung

Den Anwendungsstand vollständig prüfen, per PR auf `main` integrieren und den vollständigen Commit-SHA festhalten. Der vorbereitende Stand ist noch kein signierter Zielrelease. Dafür wird kein Release-Tag erzeugt. Der Herkunftsnachweis mit `releaseEligible: false` ersetzt keine Freigabe.

## Repository per URL importieren

1. Auf der Zielinstanz prüfen, dass **Repository by URL** aktiviert ist und der Importzugang die erforderlichen Rechte besitzt.
2. **New project/repository → Import project → Repository by URL** wählen. Als Quelle `https://github.com/TimoFrank/versorgungskompass.git` verwenden. Zielbereich, Projektname und private Sichtbarkeit prüfen.
3. GitHub-Benutzername und kurzlebigen PAT mit Lesezugriff auf dieses Repository in die Zugangsfelder eintragen. Den Token nicht in die URL einbetten oder in Git, Dokumentation und Logs schreiben.
4. Import starten. Danach den vollständigen `main`-Commit-SHA und das Taginventar mit der bestätigten GitHub-Quelle vergleichen. Der URL-Import übernimmt deren Commits und erzeugt keinen Release-Tag.
5. Importergebnis und institutionelle Quellverantwortung protokollieren. Die Pipeline auf die bestätigte GitLab-Quell-URL und geschützten Plattformwerte ausrichten.

Diese Quellvorbereitung führt den Import nicht aus. Die [offizielle GitLab-Anleitung](https://docs.gitlab.com/user/import/third_party_systems/repo_by_url/) beschreibt Voraussetzungen und Zugangsfelder. Einzelne Optionen hängen von der Zielinstanz ab.

## Updates

Änderungen werden gezielt mit Herkunftsnachweis und Merge Request übernommen. Umfang, Datenvertrag, Security und QA vor der Integration prüfen. Das Projekt für Updates nicht erneut importieren oder automatisch bidirektional spiegeln. Ausgangscommit, übernommene Änderung und GitLab-Commit nachvollziehbar verbinden.

Vor einem Update Oberfläche, API und Datenbankschema gemeinsam auf Kompatibilität prüfen. Ein Helm-Rollback stellt Oberfläche oder Datenbank nicht automatisch zurück. Nach fachlichen Schreibvorgängen ist ein alter Dump kein verlustfreier Rückweg.

## Späterer Release

Nach institutioneller Prüfung und Freigabe einen geeigneten signierten, annotierten Produkt-Tag `vX.Y.Z` festlegen. Quell-URL, Tagobjekt, Commit, Signatur und unabhängig bestätigten Fingerprint verifizieren. Oberfläche und API frisch aus demselben Tag bauen und über eigene Digests nachweisen.

Plattform- und Security-Gates sowie die vollständige [Zielabnahme](../betrieb-und-deployment/BETRIEB_GEMATIK.md#erforderliche-reale-zielprüfungen) bleiben verbindlich. Die Quellübernahme ist keine Freigabe für echte Fachdaten oder ein GKE-Deployment. Die erste stabile Version `v1.0.0` benötigt eine ausdrückliche Entscheidung und ein verifiziertes Target-Deployment.
