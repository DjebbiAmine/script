import { Association, ScriptSequence } from '../types';
import { CallCenterDB } from './types';

// Default campaigns + scripts used to seed an empty database (Postgres).
export const DEFAULT_ASSOCIATIONS: Association[] = [
  {
    id: 'him',
    nom: "Handicap International",
    logo_url: "https://images.unsplash.com/photo-1593113598332-cd288d649433?w=150&auto=format&fit=crop&q=60",
    date_creation: "2026-06-18"
  },
  {
    id: 'ccfd',
    nom: "CCFD - Terre Solidaire",
    logo_url: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=150&auto=format&fit=crop&q=60",
    date_creation: "2026-06-18"
  }
];

export const DEFAULT_SEQUENCES: ScriptSequence[] = [
  {
    id: 's1',
    association_id: 'him',
    titre_sequence: "1. S'identifier & Contact (Accroche)",
    texte_script: `[VERT CLAIR] [GRAS]Allo bonjour! ....[/GRAS] [/VERT CLAIR]

[GRAS]Oui[/GRAS]
"Monsieur / Madame...........?, je suis sofia alami / samy sabri et je vous appelle de la part d’Handicap International ( que vous connaissez peut etre de nom ou de reputation) ?"

"Et / ou"
"avec votre permission bien sur je ne prendrais que 2 petites minutes de votre temps et je vous libère ensuite c‘est promis, vous me le permettez Mr/Mme.....?"`,
    ordre: 1,
    type: 'script'
  },
  {
    id: 's2',
    association_id: 'him',
    titre_sequence: "2. L'argumentaire",
    texte_script: `"Merci,"

"Savez-vous que depuis plus de 44 ans, [GRAS]HANDICAP INTERNATIONAL[/GRAS] lutte contre les [COULEUR=#DC2626][GRAS]mines anti-personnel[/GRAS][/COULEUR] et les bombes a sous munition"

"Nous intervenons principalement dans les zones de guerre et de conflits où ces armes barbares font encore une victimes toutes les 30 minutes, [GRAS]95% de ces victimes sont des civils[/GRAS] et malheureusement presque 40% d’entre elles des enfants."

"car vous le savez avec l’insouciance de leur age ils courts ils jouent et quand ils trouvent une mine anti-personnelle ils pensent que c’est un jouet et quand elle ne les tue pas elle reste a l’origine de blessures sévères entraînant souvent [COULEUR=#DC2626][GRAS]l’amputation d’un bras ou d’une jambe[/GRAS][/COULEUR]."

"D’ailleurs Mr/Mme j’aimerais vous demandez sans être indiscret bien sur, avez vous des causes ou des associations qui vous tiennes a cœur et que vous soutenez ?"

"c est tout a votre honneur et pourrais je connaitre une association que vous soutenez peut etre depuis longtemps"

"Hé bien Mr/Mme je vous dis bravo pour ce que vous faites personnellement je pense que toutes les causes sont louables et méritent d’etre soutenues."

"Comme vous savez peut être nous avons des équipes de volontaire sur le terrain pour apporter en premier lieu des soins post-traumatiques avec notamment du soutien psychologique. Puis nous leur fabriquons une prothèse, un fauteuil roulant ou des béquilles selon les besoins. Chez l’enfant comme vous l’imaginez la prothèse doit être changée tous les 6 mois pour suivre sa croissance et enfin nous leurs donnons des séances de rééducations pour leur réapprendre à marcher avec cette nouvelle jambe."

"afin de nous permettre de continuer a bien nos missions, je vous propose de nous apporter votre soutien pour cette campagne ."

[ORANGE/JAUNE CLAIR] 💡 Avec un soutien de par exemple [TAILLE=18][GRAS]80€[/GRAS][/TAILLE] vous contribuez à financer la fabrication de [COULEUR=#16A34A][GRAS]deux prothèses[/GRAS][/COULEUR] qui permettront à 2 enfants amputés de « vivre à nouveau debout ». [/ORANGE/JAUNE CLAIR]

"Donc Mr/Mme est ce que ces enfants pourraient compter sur un soutien de 80 euro de votre part?"`,
    ordre: 2,
    type: 'script'
  },
  {
    id: 's3',
    association_id: 'him',
    titre_sequence: "3. Verrouillage & Blindage",
    texte_script: `[VERT CLAIR] [GRAS]VERROUILLAGE :[/GRAS]
"Tres bien, donc puis-je noter de votre part comme promesse de don la somme de……euros au profit handicap international?" [/VERT CLAIR]

"C’est formidable, je vous explique vous allez recevoir un courrier de la part de notre président dans lequel bien sur notre appel sera authentifiée, vous y trouverez un bon de générosité et une enveloppe timbrée et libellée a l’adresse d’handicap international dans laquelle vous n’aurez qu’a glisser votre chèque, cela vous convient Mr/Mme.....,?"

"Très bien je vais rapidement confirmer vos coordonnées pour la bonne réception de notre courrier"
- c’est bien M /Mme...... ?
- Votre prénom svp .....?
- Vous habitez toujours au (numéro, le nom de la rue / le code postal et la ville)
- Y a-t-il un complément d’adresse à rajouter, un nom de résidence, numéro de bâtiment d’appartement ?

"Très bien, Mr/Mme sachez qu’aujourd’hui vous avez la possibilité de nous aider doublement, premièrement vous nous aidez a poursuivre nos actions sur le terrain grâce a votre générosité et deuxièmement vous pouvez nous aider a faire des économies sur l’envoie d’un courrier en faisant votre don en ligne sur un formulaire pré-rempli directement sur le site d’handicap international. si cela vous convient j’aurais besoin de votre adresse e-mail svp pour vous envoyer le lien."

"Si le prospect accepte prendre son e-mail ou le confirmer, envoyer le lien ( par e-mail ou SMS ) et faire votre blindage : donc Mr/Mme vous allez recevoir ce lien dans quelques instant, vous engagez vous a nous retourner votre soutien de xx euros a la réception de cette e-mail?"

"Si le prospect ne désire pas le faire par SMS ou e-mail: très bien il n’y a pas de soucis Mr/Mme"

[VERT CLAIR] [GRAS]BLINDAGE :[/GRAS]
"vous allez recevoir notre courrier d’ici quatre a cinq jours voir une semaine
Donc vous engagez-vous à nous renvoyer votre don de [COULEUR=#16A34A]XX.... euros[/COULEUR]
à la réception de notre courrier ?" [/VERT CLAIR]

[VERT CLAIR] [GRAS]Indécis blindage : Je ne sais pas peut être ![/GRAS]
"Mr/Mme….votre intention de nous soutenir ne témoigne que de votre générosité, votre engagement nous confortera dans notre volonté d’agir et nous permettra de prévoir nos actions en établissant a notre niveau un budget prévisionnel. Aussi, sans faire trop d’effort, à quel moment pouvez-vous nous retourner votre soutien ?" [/VERT CLAIR]

[VERT CLAIR] (Si le prospect donne une date) : [/VERT CLAIR]
"Donc si je comprends bien vous vous engagez à nous envoyer votre soutien (x jours) après la réception de notre courrier ?"`,
    ordre: 3,
    type: 'script'
  },
  {
    id: 's4',
    association_id: 'him',
    titre_sequence: "4. Prise de congé",
    texte_script: `[GRAS]Prise de congé[/GRAS]

"He bien Mr/Mme il ne me reste plus qu’a vous dire un grand merci pour votre générosité et aussi pour le temps que vous m’avez accordé au nom de toute équipe d’handicap international je vous souhaite de passer une excellente journée, portez vous bien Mr/Mme et je vous dis au revoir."`,
    ordre: 4,
    type: 'script'
  },
  {
    id: 'o1',
    association_id: 'him',
    titre_sequence: "Objection : NON (faux numéro)",
    texte_script: `"Ah ! Désolé apparemment je me suis trompé, mais vous savez mon appel n'est pas forcement nominatif, je suis Sofia alami / Samy jabry et Je vous appelle de la part d’handicap international que vous connaissez peut être de nom ou de réputation?   "`,
    ordre: 1,
    type: 'objection',
    parent_sequence_id: 's1'
  },
  {
    id: 'o2',
    association_id: 'him',
    titre_sequence: "Objection : Je ne suis pas intéressé / pas le temps / occupé",
    texte_script: `"Apparemment vous êtes souvent appelé au téléphone ? effectivement a votre place je réagirais de la même manière, moi ce que je peut faire a mon niveau c’est remonter l’information pour que vous ne soyez plus dérangé par handicap international.

Mais en attendant puisque je vous ai au bout du fil et avec votre permission bien sur, et ce que je peux prendre 2 petites minute de votre temps et je vous libere ensuite c’est promis.

Vous me le permettez Mme/ Mr .....?"`,
    ordre: 2,
    type: 'objection',
    parent_sequence_id: 's1'
  },
  {
    id: 'o3',
    association_id: 'him',
    titre_sequence: "Objection : Vous m’appelez pour un don / retraite / pas de moyens",
    texte_script: `"Je vous rassure mon appel n’aurait plus aucun sens s’il se limitait à un don, le plus important pour nous et de vous informer sur nos action donc avec votre permission bien sur je ne prendrais qu’une petite minute de votre temps et je vous libère ensuite, c’est promis. Vous me le permettez Mr /Mme.....?"`,
    ordre: 3,
    type: 'objection',
    parent_sequence_id: 's1'
  },
  {
    id: 'o4',
    association_id: 'him',
    titre_sequence: "Objection : Trop sollicité / donne à d'autres associations",
    texte_script: `"Ah et bien bravo pour ce que vous faites, cela ne témoigne que de votre générosité  , je vous rassure le but n’est absolument pas de changer vos habitudes caritatives, je vous explique en 2 petites minutes ce dont il s’agit et je vous libère ensuite c’est promis, vous me le permettez Mme/Mr…….. ;"`,
    ordre: 4,
    type: 'objection',
    parent_sequence_id: 's1'
  },
  {
    id: 'o5',
    association_id: 'him',
    titre_sequence: "Objection : Je ne donne pas d’argent par téléphone",
    texte_script: `"je vous rassure, il n’est pas question que vous donniez de l’argent par téléphone. Si vous désirez soutenir notre association, vous recevrez un courrier de notre part.

En attendant et avec votre permission bien sur je ne prendrais que deux petites minutes de votre part et je vous libère ensuite, c’est promis vous me le permettez Mr/Mme......?"`,
    ordre: 5,
    type: 'objection',
    parent_sequence_id: 's1'
  },
  {
    id: 'o6',
    association_id: 'him',
    titre_sequence: "Objection : D'OÙ AVEZ VOUS EU MES COORDONNÉES",
    texte_script: `"Tout simplement de l’annuaire téléphonique (ou électronique)"`,
    ordre: 6,
    type: 'objection',
    parent_sequence_id: 's1'
  },
  {
    id: 'o7',
    association_id: 'him',
    titre_sequence: "Objection : JE SUIS EN LISTE ROUGE",
    texte_script: `"Je vous prie de nous excuser Mr/Mme, nos fichiers ne sont apparemment pas actualisés je remonte l’information pour que vous ne soyez plus importuné par handicap international.

Sur ce Mme/Mr je vous remercie pour le moment que vous m’avez accordé, en mon nom et au nom de toute l’équipe de la fondation, je vous souhaite une excellente journée (ou soirée) et au revoir."`,
    ordre: 7,
    type: 'objection',
    parent_sequence_id: 's1'
  },
  {
    id: 'o8',
    association_id: 'him',
    titre_sequence: "Objection : JE SUIS EN LISTE BLOCTEL OU PACITEL",
    texte_script: `"Si je ne me trompe pas le bloctel ne concerne que les démarches commerciales,et nous nous sommes une association humanitaire donc avec votre permission bien sur je ne prendrais que 2 petites minutes de votre temps et je vous libère ensuite c’est promis, vous me le permettez Mr/Mme...."`,
    ordre: 8,
    type: 'objection',
    parent_sequence_id: 's1'
  },
  {
    id: 'o9',
    association_id: 'him',
    titre_sequence: "Objection : Pas les moyens (Argumentaire)",
    texte_script: `[VERT CLAIR] "Donc si j’ai bien compris, vous me dites que" (reformulation) [/VERT CLAIR]

"et bien M.MME DUPONT, je suis d’accord avec vous pour dire que cette conjoncture nous impacte tous et particulièrement  nos retraités qui ne sont pas gâtés par l’état, j’entends bien vos difficultés et dans ce sens, je tiens à vous rassurer, il ne s’agit pas de vous demander d’aller haut de-là de vos disponibilités, nous voulons que les personnes qui nous soutiennent gardent les moyens de vivre dignement sans quoi notre action n’aurait pas de sens, c’est pourquoi que tous les dons sont précieux et nous permettent de porter secours aux victimes qui se retrouvent généralement avec un bras ou une jambe amputée suite à l’explosion de ces engins de guerre."

"Nous implantons en priorité nos unités d'appareillage et de rééducation dans les zones où les handicaps sont les plus nombreux, là où aucune structure n'existe avant notre arrivée, notre action vise non seulement à 'réparer' leur handicap physique mais aussi à les accompagner psychologiquement pour qu’ils puissent surmonter leur traumatismes  et ce n’est que tous ensemble qu’on pourra soulager la douleur de toutes ces victimes, leur permettre de remarcher à nouveau et de retrouver un semblant de vie normal."

"Aussi, je comprends facilement que [GRAS]80€[/GRAS] ne soit pas une somme anodine, est-ce qu’un soutien de [COULEUR=#16A34A][GRAS]40€[/GRAS][/COULEUR] serait plus accessible à votre budget ?"`,
    ordre: 9,
    type: 'objection',
    parent_sequence_id: 's2'
  },
  {
    id: 'o10',
    association_id: 'him',
    titre_sequence: "Objection : Donne à plusieurs associations (Argumentaire)",
    texte_script: `"Effectivement, vous êtes sollicités, vous donnez à……, vraiment bravo pour ce que vous faites cela ne témoigne que de votre générosité, mon intention n’est pas de vous détourner des associations que vous aidez et qui ont aussi besoin de votre soutien. Je suis conscient(e) qu’il y a de nombreuses causes à soutenir et je sais aussi que nos donateurs sont souvent engagés aux côtés d’autres associations, et ce n’est que tous ensemble qu’on pourra continuer à assurer nos missions auprès des personnes handicapées."

"L’année passée ce sont plus de 2 millions de victimes qui ont pu bénéficier directement de notre aide et de vivre à nouveau debout, mais et comme vous le savez peut-être la grande majorité des victimes sont des enfants innocents car il y a certaines mines antipersonnel qui ressemblent à des jouets voire des papillons et les séquelles sont irréversibles pour tous les enfants qui survivent à l’explosion. Morts, blessures et souffrances, tel est le triste héritage laissé par les mines antipersonnel, c’est pourquoi que l’union du plus grand nombre nous est indispensable afin d’apporter l’aide nécessaire à ces populations oubliées."

"D’ailleurs c’est vrai que [GRAS]80€[/GRAS] n’est pas une somme anodine, vous savez ce n'était qu'un exemple. Est-ce qu’un soutien de [COULEUR=#16A34A][GRAS]40€[/GRAS][/COULEUR] est plus accessible à votre budget ?"`,
    ordre: 10,
    type: 'objection',
    parent_sequence_id: 's2'
  },
  {
    id: 'o11',
    association_id: 'him',
    titre_sequence: "Objection : Conjoint (Je souhaite en parler à Mme/M) (Argumentaire)",
    texte_script: `"C’est Mme/Mr qui s’en occupe ou vous le faites ensemble?"

[VERT CLAIR] Si c’est Mme/Mr qui s’en occupe: [/VERT CLAIR]
"très bien c’est tout à son honneur et est-ce qu’il vous est déjà arrivé de soutenir une association indépendamment de Mme/Mr ?"
[VERT CLAIR] (Traiter l'objection conjoint quelque soit la réponse de même s'ils le font ensemble). [/VERT CLAIR]

"Je comprends parfaitement que ce genre de décisions se prennent à deux, je vous laisserai le soin de lui en parler, en attendant je ne vous cache pas qu’il est primordial pour nous de quantifier nos moyens, connaître nos ressources à venir pour savoir quand et comment agir."
- À 80€ : traiter une objection directe.
- À 50€ : resensibilisation.

"Ensuite: Aussi indépendamment de MME/M, peut-on compter sur un soutien de par exemple (positionnement de replis, [COULEUR=#16A34A][GRAS]50€[/GRAS][/COULEUR] ou [COULEUR=#16A34A][GRAS]20/25€[/GRAS][/COULEUR]), par la suite si Mme/Mr décide de se joindre à vous et de donner un peu plus ça ne sera qu’une agréable surprise pour nous. Aussi peut-on compter sur un soutien de par exemple XX de votre part ?"

[VERT CLAIR] (Si le prospect accepte : passer au verrouillage-blindage) [/VERT CLAIR]

[VERT CLAIR] [GRAS]Après blindage :[/GRAS] [/VERT CLAIR]
"Sommes-nous d'accord pour dire que vous vous engagez personnellement à nous soutenir indépendamment de Mr/Mme ?"`,
    ordre: 11,
    type: 'objection',
    parent_sequence_id: 's2'
  },
  {
    id: 'o12',
    association_id: 'him',
    titre_sequence: "Objection : Pas les moyens (Etape 3)",
    texte_script: `"Je comprends tout à fait Mr/Mme, notre but n'est absolument pas de vous mettre en difficulté, votre situation est tout à fait respectable. Dites-moi en toute simplicité, quel est le montant qui rentrerait le plus confortablement dans votre budget, peut-être de [COULEUR=#16A34A][GRAS]20 ou 30 €[/GRAS][/COULEUR] ? Chaque don est précieux, il n'y a pas de petite contribution."`,
    ordre: 12,
    type: 'objection',
    parent_sequence_id: 's3'
  },
  {
    id: 'o13',
    association_id: 'him',
    titre_sequence: "Objection : Conjoint (Etape 3)",
    texte_script: `"Je comprends parfaitement, Mme/Mr. C'est tout à votre honneur de prendre cette décision ensemble. Cependant, pour nous permettre de prévoir notre budget d'action et limiter les coûts d'envoi en validant dès maintenant la promesse de principe, pourrions-nous fixer une base minimale de [COULEUR=#16A34A][GRAS]20 ou 25 €[/GRAS][/COULEUR] ? Vous restez totalement libre de l'ajuster ou de l'annuler à la réception du courrier après en avoir discuté."`,
    ordre: 13,
    type: 'objection',
    parent_sequence_id: 's3'
  },
  {
    id: 'o14',
    association_id: 'him',
    titre_sequence: "Traitement courrier à 45 euro",
    texte_script: `"Vous souhaitez recevoir notre courrier et cela ne témoigne que de votre intention de nous soutenir, si je vous pose cette question relative au montant, c’est afin d’avoir un peu de visibilité sur nos financements futurs pour pouvoir planifier nos actions, nous avons donc besoin d’avoir une idée par rapport au type de montant que vous pourrez nous envoyer.\n\n[VERT CLAIR] (Traiter la resensibilisation) [/VERT CLAIR]\n\nsachant que chaque don est essentiel et qu’il n’y a pas de petit dons, dites moi tout simplement quel est le montant qui rentrerait le plus confortablement dans votre budjet, peut être…. [COULEUR=#16A34A][GRAS]20 ou 30€[/GRAS][/COULEUR]"`,
    ordre: 14,
    type: 'objection',
    parent_sequence_id: 's2'
  },
  {
    id: 'o15',
    association_id: 'him',
    titre_sequence: "Resensibilisation 20/25 euros",
    texte_script: `"J’aimerai vous dire une dernière chose et je vous libère si le HANDICAPE INTERNATIONAL m’a demandé de vous contacter aujourd’hui c’est que la situation est vraiment préoccupante et ce n’est que tous ensemble, bénévoles, donateurs, que nous pourrons agir durablement contre les causes de la faim et des inégalités. Nous comptons aujourd’hui plus de 700 millions de personnes qui souffrent de la faim à travers le monde. C’est pourquoi, Le HANDICAPE INTERNATIONAL agit sur le long terme en soutenant des associations locales et des projets durables, comme l’agriculture familiale, qui permettent aux populations de se nourrir par leur propre travail et de devenir autonomes, plutôt que de dépendre d’une aide d’urgence temporaire. Concrètement, plus de 500 projets sont menés dans 72 pays, améliorant ainsi la vie de plus de 2 millions de personnes, les résultats sont donc encourageants mais loin d’être suffisants. \n\net afin de poursuivre nos actions, votre soutien quel qu’en soit le montant nous est indispensable et précieux et comme on dit ce sont les petits ruisseaux qui forment les grandes rivières donc dites-moi tout simplement et sans faire beaucoup d’efforts quel est le montant qui vous parait envisageable… (marquer un temps d’arrêt de 3 secondes, si le prospect ne se prononce pas ).peut être [COULEUR=#16A34A][GRAS]20 ou 25€[/GRAS][/COULEUR] ?"`,
    ordre: 15,
    type: 'objection',
    parent_sequence_id: 's2'
  },
  {
    id: 'o16',
    association_id: 'him',
    titre_sequence: "Objection : Faire le don sur Internet",
    texte_script: `"Eh bien écouté Mr/Mme vous désirez faire votre don sur internet cela ne prouve que de votre intention de nous soutenir, mais vous l’avez compris aujourd’hui je vous appel pour une campagne spécifique , une campagne qui nous permettra d’agir de manière ciblée, donc si vous acceptez de le faire suite au courrier que je vais vous envoyer votre soutien ira directement à cette campagne. En plus vous serez noté a notre niveau que vous nous avez soutenu, et vous n’aurez plus besoin d'être rappelé ultérieurement, donc Mr/Mme acceptez vous de le faire suite a notre courrier ?"`,
    ordre: 16,
    type: 'objection',
    parent_sequence_id: 's2'
  },
  {
    id: 'o17',
    association_id: 'him',
    titre_sequence: "Objection : INDÉCIS Montant",
    texte_script: `"Si je vous pose la question relative au montant, ce n’est en aucun cas pour vous paraitre pressant ou indélicat, je m’excuse si c’est peut-être l’impression que je vous donnes, mais comme toute ONG, nous ne disposons pas de fonds sûrs, donc nous devons nous baser sur un budget prévisionel, qui nous permet de quantifier nos moyens afin de bien planifier nos actions, donc pour ne pas vous presser, je vous propose de vous baser sur un montant minimum de par exemple [COULEUR=#16A34A][GRAS]15 ou 20 €[/GRAS][/COULEUR] et par la suite si vous décidez de donner ne serait-ce qu’un euro de plus, ca ne sera qu’une excellente surprise pour nous, on fait comme ca ?"`,
    ordre: 17,
    type: 'objection',
    parent_sequence_id: 's3'
  },
  {
    id: 'o18',
    association_id: 'him',
    titre_sequence: "Objection : INDÉCIS RETOUR (Blindage)",
    texte_script: `"J’entends une petite hésitation de votre part 🙂 , et je tenais à vous rassurer, le don se fait uniquement en fonction de vos moyens et vos disponibilités, seulement, nous avons besoin d’avoir une visibilité pour établir ce qu’on appel un budget prévisionnel, qui nous permet d’organiser nos actions et prévoir nos dépenses, ainsi sans vouloir vous paraître pressant ou indélicat, dites moi tout simplement au plus tard, et sans faire trop d’efforts, à quel moment pensez-vous pouvoir nous retourner votre précieux don ?"`,
    ordre: 18,
    type: 'objection',
    parent_sequence_id: 's3'
  },
  {
    id: 'ccfd_s1',
    association_id: 'ccfd',
    titre_sequence: "1. S'identifier & Contact (Accroche)",
    texte_script: `[VERT CLAIR] [GRAS]Allo bonjour! ....[/GRAS] [/VERT CLAIR]\n\n[GRAS]Oui[/GRAS]\n"Monsieur / Madame...........?, je suis Julie Amon / Nicolas Amon, je vous contacte de la part de l’association CCFD – Terre Solidaire. (ou Comité Catholique contre la Faim et pour le Développement)"\n"que vous connaissez peut être de nom ou de réputation ?"\n\n"Et / ou"\n"avec votre permission bien sur je ne prendrais que 2 petites minutes de votre temps et je vous libère ensuite c‘est promis, vous me le permettez Mr/Mme.....?"`,
    ordre: 1,
    type: 'script'
  },
  {
    id: 'ccfd_s2',
    association_id: 'ccfd',
    titre_sequence: "2. L'argumentaire",
    texte_script: `"Merci Mr/ Mme"\n\n"Il faut savoir que depuis plus de 60 ans, l’association [GRAS]CCFD – Terre Solidaire[/GRAS], mène des projets de solidarité internationale, dans plus de 70 pays en difficulté, notamment en matière de lutte contre la faim et les inégalités., nous permettons à des familles entières de subvenir elles-mêmes à leurs propres besoins, en pérennisant nos actions sur le long terme."\n\n"D’ailleurs, j’aimerais vous demander, sans être indiscret bien sûr [GRAS]avez vous des causes ou des associations qui vous tiennent à cœur et que vous soutenez?[/GRAS]"\n\n"c est tout a votre honneur et pourrais je connaitre une association que vous soutenez peut etre depuis longtemps"\n\n"Et bien bravo pour ce que vous faites, personnellement je pense que toutes les causes sont louables et méritent d’être défendues."\n\n"Aujourd’hui, nous sommes particulièrement mobilisés dans plusieurs régions du monde où des populations ont de plus en plus de difficultés à vivre de leurs terres."\n\n"Par exemple, au [GRAS]Brésil[/GRAS], en Amazonie, nous travaillons avec notre partenaire [GRAS]FASE[/GRAS] – pour soutenir les communautés locales qui protègent leurs terres face à l’exploitation des ressources naturelles."\n\n"Dans d’autres régions du Brésil, nous accompagnons également les populations touchées par l’exploitation minière avec l’organisation [GRAS]Justiça nos Trilhos[/GRAS], afin de défendre leurs droits et préserver leurs moyens de subsistance."\n\n"Et à [GRAS]Madagascar[/GRAS], grâce à notre partenaire [GRAS]FARM[/GRAS], nous soutenons des femmes rurales qui développent l’agroécologie pour nourrir leurs familles et renforcer l’autonomie de leurs communautés."\n\n"Ce que je vous invite à retenir M.MME DUPONT, c’est qu’aujourd’hui encore des milliers de personnes risquent leur vie, sous la menace des multinationales, des centaines de familles sont obligées de fuir leur village et c’est tous ensemble que nous pourrons leur permettre de se défendre, faire entendre leurs droits à la terre et surtout leur offrir la dignité de se nourrir de leur propre travail."\n\n[ORANGE/JAUNE CLAIR] 💡 Donc Moi ce que je vous propose, c’est de nous apporter votre soutien à hauteur de par exemple [TAILLE=18][GRAS]80 €[/GRAS][/TAILLE] , avec lequel vous permettez la conservation d’1 hectare de forêt tropicale et à 1 famille de locaux de gagner 900 euro/an grâce à la vente de produits forestiers (noix du Brésil, açaí, majo et autres). [/ORANGE/JAUNE CLAIR]\n\n"Aussi Mr/Mme .... ces populations vulnérables pourraient elles compter sur un soutien de [COULEUR=#16A34A][GRAS]80 €[/GRAS][/COULEUR] de votre part, sachant qu’après déduction fiscale de [GRAS]66%[/GRAS], cela ne vous coûte en réalité que [COULEUR=#16A34A][GRAS]27 €[/GRAS][/COULEUR] ?"`,
    ordre: 2,
    type: 'script'
  },
  {
    id: 'ccfd_s3',
    association_id: 'ccfd',
    titre_sequence: "3. Verrouillage & Blindage",
    texte_script: `[VERT CLAIR] [GRAS]VERROUILLAGE :[/GRAS]\n"Tres bien, donc puis-je noter de votre part comme promesse de don la somme de ……euros au profit de CCFD?" [/VERT CLAIR]\n\n"C’est formidable, je vous explique vous allez recevoir un courrier de la part de notre président dans lequel bien sur notre appel sera authentifiée, vous y trouverez un bon de générosité et une enveloppe timbrée et libellée a l’adresse de CCFD dans laquelle vous n’aurez qu’a glisser votre chèque, cela vous convient Mr/Mme.....,?"\n\n"Très bien je vais rapidement confirmer vos coordonnées pour la bonne réception de notre courrier"\n- c’est bien M /Mme...... ?\n- Votre prénom svp .....?\n- Vous habitez toujours au (numéro, le nom de la rue / le code postal et la ville)\n- Y a-t-il un complément d’adresse à rajouter, un nom de résidence, numéro de bâtiment d’appartement ?\n\n"Très bien, Mr/Mme sachez qu’aujourd’hui vous avez la possibilité de nous aider doublement, premièrement vous nous aidez a poursuivre nos actions sur le terrain grâce a votre générosité et deuxièmement vous pouvez nous aider a faire des économies sur l’envoie d’un courrier en faisant votre don en ligne sur un formulaire pré-rempli directement sur le site de CCFD. si cela vous convient j’aurais besoin de votre adresse e-mail svp pour vous envoyer le lien."\n\n"Si le prospect accepte prendre son e-mail ou le confirmer, envoyer le lien ( par e-mail ou SMS ) et faire votre blindage : donc Mr/Mme vous allez recevoir ce lien dans quelques instant, vous engagez vous a nous retourner votre soutien de xx euros a la réception de cette e-mail?"\n\n"Si le prospect ne désire pas le faire par SMS ou e-mail: très bien il n’y a pas de soucis Mr/Mme"\n\n[VERT CLAIR] [GRAS]BLINDAGE :[/GRAS]\n"vous allez recevoir notre courrier d’ici quatre a cinq jours voir une semaine\nDonc vous engagez-vous à nous renvoyer votre don de [COULEUR=#16A34A]XX.... euros[/COULEUR]\nà la réception de notre courrier ?" [/VERT CLAIR]\n\n[VERT CLAIR] [GRAS]Indécis blindage : Je ne sais pas peut être ![/GRAS]\n"Mr/Mme….votre intention de nous soutenir ne témoigne que de votre générosité, votre engagement nous confortera dans notre volonté d’agir et nous permettra de prévoir nos actions en établissant a notre niveau un budget prévisionnel. Aussi, sans faire trop d’effort, à quel moment pouvez-vous nous retourner votre soutien ?" [/VERT CLAIR]\n\n[VERT CLAIR] (Si le prospect donne une date) : [/VERT CLAIR]\n"Donc si si je comprends bien vous vous engagez à nous envoyer votre soutien (x jours) après la réception de notre courrier ?"`,
    ordre: 3,
    type: 'script'
  },
  {
    id: 'ccfd_s4',
    association_id: 'ccfd',
    titre_sequence: "4. Prise de congé",
    texte_script: `[GRAS]Prise de congé[/GRAS]\n\n"He bien Mr/Mme il ne me reste plus qu’a vous dire un grand merci pour votre générosité et aussi pour le temps que vous m’avez accordé au nom de toute équipe de CCFD je vous souhaite de passer une excellente journée, portez vous bien Mr/Mme et je vous dis au revoir."`,
    ordre: 4,
    type: 'script'
  },
  {
    id: 'ccfd_o1',
    association_id: 'ccfd',
    titre_sequence: "Objection : NON (faux numéro)",
    texte_script: `"Ah ! Désolé apparemment je me suis trompé, mais vous savez mon appel n'est pas forcement nominatif, je suis Julie Amon / Nicolas Amon et Je vous appelle de la part du CCFD que vous connaissez peut être de nom ou de réputation?"`,
    ordre: 1,
    type: 'objection',
    parent_sequence_id: 'ccfd_s1'
  },
  {
    id: 'ccfd_o2',
    association_id: 'ccfd',
    titre_sequence: "Objection : Je ne suis pas intéressé / pas le temps / occupé",
    texte_script: `"Apparemment vous êtes souvent appelé au téléphone ? effectivement a votre place je réagirais de la même manière, moi ce que je peut faire a mon niveau c’est remonter l’information pour que vous ne soyez plus dérangé par notre association.\n\nMais en attendant puisque je vous ai au bout du fil et avec votre permission bien sur, et ce que je peux prendre 2 petites minute de votre temps et je vous libere ensuite c’est promis. Vous me le permettez Mme/ Mr Roz.....?"`,
    ordre: 2,
    type: 'objection',
    parent_sequence_id: 'ccfd_s1'
  },
  {
    id: 'ccfd_o3',
    association_id: 'ccfd',
    titre_sequence: "Objection : Pas intéressé 2 eme anti racc",
    texte_script: `"Je vous rassure Mr/Mme je ne souhaite pas vous retenir longtemps au telephone a peine 2 petites minutes et je vous libere ensuite, vous me le permettez?"`,
    ordre: 3,
    type: 'objection',
    parent_sequence_id: 'ccfd_s1'
  },
  {
    id: 'ccfd_o4',
    association_id: 'ccfd',
    titre_sequence: "Objection : Vous m’appelez pour un don / retraite / pas de moyens",
    texte_script: `"Je vous rassure mon appel n’aurait plus aucun sens s’il se limitait à un don, le plus important pour nous et de vous informer sur nos action donc avec votre permission bien sur je ne prendrais qu’une petite minute de votre temps et je vous libère ensuite, c’est promis. Vous me le permettez Mr /Mme.....?"`,
    ordre: 4,
    type: 'objection',
    parent_sequence_id: 'ccfd_s1'
  },
  {
    id: 'ccfd_o5',
    association_id: 'ccfd',
    titre_sequence: "Objection : Trop sollicité / donne à d'autres associations",
    texte_script: `"Ah et bien bravo pour ce que vous faites, cela ne témoigne que de votre générosité, je vous rassure le but n’est absolument pas de changer vos habitudes caritatives, je vous explique en 2 petites minutes ce dont il s’agit et je vous libère ensuite c’est promis, vous me le permettez Mme/Mr…….. ;"`,
    ordre: 5,
    type: 'objection',
    parent_sequence_id: 'ccfd_s1'
  },
  {
    id: 'ccfd_o6',
    association_id: 'ccfd',
    titre_sequence: "Objection : Je ne donne pas d’argent par téléphone",
    texte_script: `"je vous rassure, il n’est pas question que vous donniez de l’argent par téléphone. Si vous désirez soutenir notre association, vous recevrez un courrier de notre part.\n\nEn attendant et avec votre permission bien sur je ne prendrais que deux petites minutes de votre part et je vous libère ensuite, c’est promis vous me le permettez Mr/Mme......?"`,
    ordre: 6,
    type: 'objection',
    parent_sequence_id: 'ccfd_s1'
  },
  {
    id: 'ccfd_o7',
    association_id: 'ccfd',
    titre_sequence: "Objection : D'OÙ AVEZ VOUS EU MES COORDONNÉES",
    texte_script: `"Tout simplement de l’annuaire téléphonique (ou électronique)"`,
    ordre: 7,
    type: 'objection',
    parent_sequence_id: 'ccfd_s1'
  },
  {
    id: 'ccfd_o8',
    association_id: 'ccfd',
    titre_sequence: "Objection : JE SUIS EN LISTE ROUGE",
    texte_script: `"Je vous prie de nous excuser Mr/Mme, nos fichiers ne sont apparemment pas actualisés je remonte l’information pour que vous ne soyez plus importuné par notre association.\n\nSur ce Mme/Mr je vous remercie pour le moment que vous m’avez accordé, en mon nom et au nom de toute l’équipe, je vous souhaite une excellente journée (ou soirée) et au revoir."`,
    ordre: 8,
    type: 'objection',
    parent_sequence_id: 'ccfd_s1'
  },
  {
    id: 'ccfd_o9',
    association_id: 'ccfd',
    titre_sequence: "Objection : JE SUIS EN LISTE BLOCTEL OU PACITEL",
    texte_script: `"Si je ne me trompe pas le bloctel ne concerne que les démarches commerciales,et nous nous sommes une association humanitaire donc avec votre permission bien sur je ne prendrais que 2 petites minutes de votre temps et je vous libère ensuite c’est promis, vous me le permettez Mr/Mme...."`,
    ordre: 9,
    type: 'objection',
    parent_sequence_id: 'ccfd_s1'
  },
  {
    id: 'ccfd_o10',
    association_id: 'ccfd',
    titre_sequence: "Objection : Pas les moyens, petite retraite (Argumentaire)",
    texte_script: `"Je sens bien votre intérêt sincère pour ce que nous faisons à CCFD, et je me doute que c’est avant tout une question de moyens qui vous freine en ce moment.\n\nDonc si j’ai bien compris, vous me dites que [VERT CLAIR](reformulation)[/VERT CLAIR] et bien M.MME DUPONT, je me doute que c’est avant tout une question de moyens qui vous freine en ce moment, j’entends bien vos difficultés , je tiens à vous rassurer, nous voulons que les personnes qui nous soutiennent gardent les moyens de vivre dignement sans quoi notre action n’aurait pas de sens, c’est pourquoi que tous les dons sont précieux et nous permettent d’agir, de freiner ces multinationales, ces grandes puissances mondiales qui se croient tout permis, qui menacent et chassent des milliers de familles de leurs villages, pire encore les menaces sont souvent mises à exécution, nous veillons donc à ce que chacun voie ses droits fondamentaux respectés : manger à sa faim, vivre de son travail, habiter dans un environnement sain et choisir le lieu où construire sa vie… , sans vous, rien n’est possible, c’est pourquoi votre participation nous est importante. \n\nAussi je comprends, 80 € ça fait peut être beaucoup, je vous rassure ce n’était qu’un exemple préfériez-vous nous soutenir à hauteur de [COULEUR=#16A34A][GRAS]45 €[/GRAS][/COULEUR], c'est plus accessible à votre budget ?"`,
    ordre: 10,
    type: 'objection',
    parent_sequence_id: 'ccfd_s2'
  },
  {
    id: 'ccfd_o11',
    association_id: 'ccfd',
    titre_sequence: "Objection : Donne à plusieurs associations (Argumentaire)",
    texte_script: `"Effectivement, vous êtes sollicités, vous donnez à……, vraiment bravo pour ce que vous faites cela ne témoigne que de votre générosité, mon intention n’est pas de vous détourner des associations que vous aidez et qui ont aussi besoin de votre soutien. Je suis conscient(e) qu’il y a de nombreuses causes à soutenir et je sais aussi que nos donateurs sont souvent engagés aux côtés d’autres associations, si je me permets de vous contacter aujourd’hui c’est que les causes de la faim sont multiples et ne cessent d’augmenter, nous parlons de populations en situation de grande souffrance, ces populations qui vivaient auparavant: d’un lopin de terre, quelques céréales, deux chèvres… de quoi se nourrir, envoyer leurs enfants à l’école et vivre dans la dignité mais les grandes entreprises et multinationales ont décidés autrement et c’est vraiment tous ensemble, donateurs, bénévoles et militants que nous pouvons veiller à ce que ces familles puissent se défendre, faire entendre leur droit à la terre face à ces multinationales destructrices et de vivre ainsi dans la dignité. \n\naussi je comprends, 80 € ça fait peut être beaucoup, je vous rassure ce n’était qu’un exemple préfériez-vous nous soutenir à hauteur de [COULEUR=#16A34A][GRAS]45 €[/GRAS][/COULEUR], c'est plus accessible à votre budget ?"`,
    ordre: 11,
    type: 'objection',
    parent_sequence_id: 'ccfd_s2'
  },
  {
    id: 'ccfd_o12',
    association_id: 'ccfd',
    titre_sequence: "Objection : Je donnerai plus tard (Argumentaire)",
    texte_script: `"Vous souhaitez donner plus tard et cela ne témoigne que de l’intérêt que vous portez à notre cause aussi de votre générosité.\n\nSeulement si nous nous sommes permis de vous contacter, c’est que nous avons besoin de ressources immédiates car mon appel est motivé par l’urgence, notamment à cause des multinationales qui convoitent les ressources de ces populations et détruisent tout sur leur passage, ces familles qui occupent ces territoires depuis toujours, ont souvent l’interdiction de chasser, pêcher ou cultiver leurs propres terres. Sous la menace, elles sont obligés d’abandonner leur village.\n\nAussi c’est vous qui nous donnez les moyens d’étendre nos actions à d’autres associations locales et continuer de l’avant. C’est vrai que 80€ n’est pas une somme anodine, vous savez ce n'était qu'un exemple. préfériez-vous nous soutenir à hauteur de [COULEUR=#16A34A][GRAS]45 €[/GRAS][/COULEUR], c’est plus accessible à votre budget ?"`,
    ordre: 12,
    type: 'objection',
    parent_sequence_id: 'ccfd_s2'
  },
  {
    id: 'ccfd_o13',
    association_id: 'ccfd',
    titre_sequence: "Objection : Pas les moyens (Etape 3)",
    texte_script: `"Je comprends tout à fait Mr/Mme, notre but n'est absolument pas de vous mettre en difficulté, votre situation est tout à fait respectable. Dites-moi en toute simplicité, quel est le montant qui rentrerait le plus confortablement dans votre budget, peut-être de [COULEUR=#16A34A][GRAS]20 ou 30 €[/GRAS][/COULEUR] ? Chaque don est précieux, il n'y a pas de petite contribution."`,
    ordre: 13,
    type: 'objection',
    parent_sequence_id: 'ccfd_s2'
  },
  {
    id: 'ccfd_o14',
    association_id: 'ccfd',
    titre_sequence: "Objection : Conjoint (Etape 3)",
    texte_script: `"C’est Mme/Mr qui s’en occupe ou vous le faites ensemble?"\n\n[VERT CLAIR]Si c’est Mme/Mr qui s’en occupe:[/VERT CLAIR]\n"très bien c’est tout à son honneur et est-ce qu’il vous est déjà arrivé de soutenir une association indépendamment de Mme/Mr ?"\n\n[VERT CLAIR](Traiter l'objection conjoint quelque soit la réponse de même s'ils le font ensemble).[/VERT CLAIR]\n\n"Je comprendsbiens parfaitement que ce genre de décisions se prennent à deux, je vous laisserai le soin de lui en parler, en attendant je ne vous cache pas qu’il est primordial pour nous de quantifier nos moyens, connaître nos ressources à venir pour savoir quand et comment agir."\n- À 80€ : traiter une objection directe. - À 50€ : resensibilisation.\n\n"Ensuite: Aussi indépendamment de MME/M, peut-on compter sur un soutien de par exemple (positionnement de replis, [COULEUR=#16A34A][GRAS]50€[/GRAS][/COULEUR] ou [COULEUR=#16A34A][GRAS]20/25€[/GRAS][/COULEUR]), par la suite si Mme/Mr décide de se joindre à vous et de donner un peu plus ça ne sera qu’une agréable surprise pour nous. Aussi peut-on compter sur un soutien de par exemple XX de votre part ?"`,
    ordre: 14,
    type: 'objection',
    parent_sequence_id: 'ccfd_s3'
  },
  {
    id: 'ccfd_o15',
    association_id: 'ccfd',
    titre_sequence: "Traitement courrier à 45 euro",
    texte_script: `"Vous souhaitez recevoir notre courrier et cela ne témoigne que de votre intention de nous soutenir, si je vous pose cette question relative au montant, c’est afin d’avoir un peu de visibilité sur nos financements futurs pour pouvoir planifier nos actions, nous avons donc besoin d’avoir une idée par rapport au type de montant que vous pourrez nous envoyer.\n\n[VERT CLAIR] (Traiter la resensibilisation) [/VERT CLAIR]\n\nsachant que chaque don est essentiel et qu’il n’y a pas de petit dons, dites moi tout simplement quel est le montant qui rentrerait le plus confortablement dans votre budjet, peut être…. [COULEUR=#16A34A][GRAS]20 ou 30€[/GRAS][/COULEUR]"`,
    ordre: 15,
    type: 'objection',
    parent_sequence_id: 'ccfd_s2'
  },
  {
    id: 'ccfd_o16',
    association_id: 'ccfd',
    titre_sequence: "Resensibilisation 20/25 euros",
    texte_script: `"J’aimerai vous dire une dernière chose et je vous libère si le CCFD m’a demandé de vous contacter aujourd’hui c’est que la situation est vraiment préoccupante et ce n’est que tous ensemble, bénévoles, donateurs, que nous pourrons agir durablement contre les causes de la faim et des inégalités. Nous comptons aujourd’hui plus de 700 millions de personnes qui souffrent de la faim à travers le monde. C’est pourquoi, Le CCFD-Terre Solidaire agit sur le long terme en soutenant des associations locales et des projets durables, comme l’agriculture familiale, qui permettent aux populations de se nourrir par leur propre travail et de devenir autonomes, plutôt que de dépendre d’une aide d’urgence temporaire. Concrètement, plus de 500 projets sont menés dans 72 pays, améliorant ainsi la vie de plus de 2 millions de personnes, les résultats sont donc encourageants mais loin d’être suffisants. \n\net afin de poursuivre nos actions, votre soutien quel qu’en soit le montant nous est indispensable et précieux et comme on dit ce sont les petits ruisseaux qui forment les grandes rivières donc dites-moi tout simplement et sans faire beaucoup d’efforts quel est le montant qui vous parait envisageable… (marquer un temps d’arrêt de 3 secondes, si le prospect ne se prononce pas ).peut être [COULEUR=#16A34A][GRAS]20 ou 25€[/GRAS][/COULEUR] ?"`,
    ordre: 16,
    type: 'objection',
    parent_sequence_id: 'ccfd_s2'
  },
  {
    id: 'ccfd_o17',
    association_id: 'ccfd',
    titre_sequence: "Objection : Faire le don sur Internet",
    texte_script: `"Eh bien écouté Mr/Mme vous désirez faire votre don sur internet cela ne prouve que de votre intention de nous soutenir, mais vous l’avez compris aujourd’hui je vous appel pour une campagne spécifique , une campagne qui nous permettra d’agir de manière ciblée, donc si vous acceptez de le faire suite au courrier que je vais vous envoyer votre soutien ira directement à cette campagne. En plus vous serez noté a notre niveau que vous nous avez soutenu, et vous n’aurez plus besoin d'être rappelé ultérieurement, donc Mr/Mme acceptez vous de le faire suite a notre courrier ?"`,
    ordre: 17,
    type: 'objection',
    parent_sequence_id: 'ccfd_s3'
  },
  {
    id: 'ccfd_o18',
    association_id: 'ccfd',
    titre_sequence: "Objection : INDÉCIS Montant",
    texte_script: `"Si je vous pose la question relative au montant, ce n’est en aucun cas pour vous paraitre pressant ou indélicat, je m’excuse si c’est peut-être l’impression que je vous donnes, mais comme toute ONG, nous ne disposons pas de fonds sûrs, donc nous devons nous baser sur un budget prévisionel, qui nous permet de quantifier nos moyens afin de bien planifier nos actions, donc pour ne pas vous presser, je vous propose de vous baser sur un montant minimum de par exemple [COULEUR=#16A34A][GRAS]15 ou 20 €[/GRAS][/COULEUR] et par la suite si vous décidez de donner ne serait-ce qu’un euro de plus, ca ne sera qu’une excellente surprise pour nous, on fait comme ca ?"`,
    ordre: 18,
    type: 'objection',
    parent_sequence_id: 'ccfd_s3'
  },
  {
    id: 'ccfd_o19',
    association_id: 'ccfd',
    titre_sequence: "Objection : INDÉCIS RETOUR (Blindage)",
    texte_script: `"J’entends une petite hésitation de votre part 🙂 , et je tenais à vous rassurer, le don se fait uniquement en fonction de vos moyens et vos disponibilités, seulement, nous avons besoin d’avoir une visibilité pour établir ce qu’on appel un budget prévisionnel, qui nous permet d’organiser nos actions et prévoir nos dépenses, ainsi sans vouloir vous paraître pressant ou indélicat, dites moi tout simplement au plus tard, et sans faire trop d’efforts, à quel moment pensez-vous pouvoir nous retourner votre précieux don ?"`,
    ordre: 19,
    type: 'objection',
    parent_sequence_id: 'ccfd_s3'
  }
];

export function defaultData(): CallCenterDB {
  return {
    associations: structuredClone(DEFAULT_ASSOCIATIONS),
    sequences: structuredClone(DEFAULT_SEQUENCES),
    notes: [],
    consignes: [],
  };
}
