# Arbeitsregeln für versorgungskompass

Dieses Repository führt ausschließlich den Versorgungs-Kompass und Hospitations-Kompass für den gematik-Zielbetrieb. Das Originalrepo `TimoFrank/mitmachen` bleibt mit vier Kompassen und öffentlicher Demo aktiv. Änderungen dieses Auftrags nicht ungefragt dorthin übertragen.

- Vor einer Änderung Branch, Status, Ausgangsrevision und vorhandene Vorarbeiten prüfen. Fremde Änderungen erhalten.
- `main` ist die Integrationslinie. Auf einem benannten `timo/`-Branch in einem isolierten Worktree arbeiten. Integration nur per geprüftem Pull Request, bevorzugt als Squash-Merge.
- Nur aufgabenbezogene Pfade stagen. Kein pauschales `git add .` oder `git add -A`. Staged Diff vor jedem Commit prüfen.
- Keine Secrets, PATs, OIDC-Subjects, echten Fachdaten, produktiven Exporte oder persönlichen Plattformwerte in Git, Logs oder Screenshots aufnehmen. Zugangsdaten nicht in Repository-URLs einbetten.
- Vor PR und Integration `npm run qa:full` erfolgreich ausführen. Für kleine lokale Dokumentationskorrekturen zunächst `npm run qa:small` und Sprachprüfung. Fehlgeschlagene Gates vor Push oder Merge klären.
- Sichtbare Änderungen headless im echten Browser prüfen und relevante Desktop- und Mobile-Screenshots bereitstellen. Eigene Testserver und Browser danach schließen.
- Generierte Ausgaben in `dist/` sowie temporäre Testberichte bleiben unversioniert. Nur erforderliche Quellen und Herkunftsnachweise committen.
- PRs, Commits und neue Prosa auf Deutsch schreiben. Keine Gedankenstriche oder Semikolons in Prosa. Technische Syntax erhalten.
- Die sieben aktiven Einstiegstexte kurz halten. Keine privaten oder historischen Betriebshandbücher duplizieren.
- GitHub-Integration, GitLab-Import, signierten Release, Deployment und fachliche Freigabe getrennt nachweisen. Ein grüner Test ist keine institutionelle Betriebsfreigabe.
- Tags, Import, Deployment und Datenübernahme nur im ausdrücklich beauftragten Umfang ausführen. Bestehende Autorisierung nicht erneut erfragen.

Nach dem institutionellen Import führt GitLab nur den gematik-Betriebsstand. Gemeinsame Verbesserungen aus dem Originalprojekt werden gezielt per Review übernommen. Keine automatische bidirektionale Synchronisation und kein erneuter Projektimport für Updates.
