## MODIFIED Requirements

### Requirement: Partage par lien et QR code
Chaque équipe SHALL avoir un bouton « Partager » qui affiche le lien de l'équipe, un bouton « Copier le lien », le QR code menant à ce lien, et les boutons « Copier le QR code » et « Télécharger le QR code ». Ces deux boutons SHALL produire une image PNG du QR code, noir sur fond blanc avec sa marge de lecture, portant le nom de l'équipe en dessous. Si le navigateur refuse la copie d'une image, « Copier le QR code » SHALL télécharger l'image et le signaler. Le QR code SHALL être généré dans la page, sans service tiers.

#### Scenario: Rejoindre depuis un téléphone
- **GIVEN** la fenêtre « Partager » de l'équipe « Paiement » ouverte sur un ordinateur
- **WHEN** Marc scanne le QR code avec son téléphone
- **THEN** son téléphone ouvre la matrice de l'équipe « Paiement »

#### Scenario: Coller le QR code dans un message
- **GIVEN** la fenêtre « Partager » de l'équipe « Paiement »
- **WHEN** Vincent clique sur « Copier le QR code » puis colle dans un message
- **THEN** le message contient l'image du QR code avec « Paiement » écrit dessous, et cette image se scanne
