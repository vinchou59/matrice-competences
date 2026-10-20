## Decisions

- Chaque bouton à confirmer porte `data-confirm-key`. Un écouteur de clic (phase de capture) sur le document annule la confirmation armée si le clic ne vise pas un bouton à confirmer ; l'annulation est différée (`setTimeout` 0) pour ne pas redessiner la page avant que le clic n'atteigne sa cible, sinon un clic sur un onglet ou un autre bouton serait perdu.
- Échap annule aussi.
