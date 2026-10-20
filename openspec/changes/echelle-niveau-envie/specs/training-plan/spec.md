## MODIFIED Requirements

### Requirement: Personnes à former
Pour chaque compétence, le plan SHALL proposer au plus 3 personnes présentes qui souhaitent progresser et dont le niveau est inférieur au niveau visé, les plus avancées d'abord, avec le nombre de niveaux à gagner. Le niveau visé SHALL être la cible du référent si elle n'est pas atteinte, sinon celle du back-up ; dans ce second cas, le référent MUST NOT être proposé. Les personnes qui ne souhaitent pas progresser MUST NOT être proposées. Si aucune personne notée ne souhaite progresser, le plan SHALL le signaler.

#### Scenario: Personne qui ne souhaite pas progresser
- **GIVEN** Marc Débutant en Mainframe sans envie de progresser, et Julie au niveau Aucun qui veut progresser, cible référent Autonome
- **WHEN** le plan s'affiche
- **THEN** Julie est proposée, Marc ne l'est pas
