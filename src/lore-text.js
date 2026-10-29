// "Learn more" popup content. Per opening: the idea, plans for both sides, key squares / pawn structure, common
// traps and mistakes and who plays it. `traps` items may carry `moves` (a SAN line from the start position) which
// tools/check-lore.mjs replays to prove it is legal (and ends in mate when the text says so).
const t = (name, text, moves) => ({ name, text, moves });

export const LORE = {
  italian: {
    idea: 'Develop fast and aim the light-squared bishop at f7, Black\'s most sensitive square. The main modern version is the slow "Giuoco Pianissimo" (c3, d3), where both sides build up quietly and the game is decided by manoeuvring.',
    white: ['Prepare the central break with c3 and d4, or keep it quiet with d3, Nbd2-f1-g3 and a4.', 'Castle, play Re1 and keep the bishop on the a2–g8 diagonal (Bb3).', 'Use the pressure on f7 and the f-file as a long-term target.'],
    black: ['Mirror the setup with ...Bc5, ...Nf6, ...d6 and ...O-O.', 'Prepare the ...d5 break; if it works Black equalises easily.', 'Watch f2/f7 tactics and keep the e5 pawn well supported.'],
    structure: 'Open centre with pawns on e4/e5; the key squares are d4/d5 (breaks) and f2/f7 (targets). A later d4 by White leads to open play, and a quiet d3 keeps tension.',
    traps: [t('Légal\'s Mate', 'If Black pins the knight with ...Bg4 and ignores the threat, the "sacrifice" Nxe5! wins: after ...Bxd1, Bxf7+ and Nd5# is mate.', 'e4 e5 Nf3 d6 Bc4 Bg4 Nc3 g6 Nxe5 Bxd1 Bxf7+ Ke7 Nd5#'), t('Rushing d4', 'Pushing d4 before you are ready lets Black capture and hit e4 with ...Nxe4, so prepare with c3 and Re1 first.')],
    players: 'A world-class main line: Magnus Carlsen, Fabiano Caruana and Hikaru Nakamura all use the quiet Giuoco Pianissimo, and it is a first choice for club players learning to attack.'
  },
  ruy: {
    idea: 'White pressures the knight that defends e5. There is no immediate win of a pawn, but White keeps a small, lasting initiative. The Ruy Lopez is the most analysed and respected 1.e4 e5 opening.',
    white: ['Castle, play Re1, c3 and d4 to build a big centre.', 'Re-route the knight with Nbd2-f1-g3 and play h3, a4 to restrain Black\'s queenside.', 'Often keep the bishop pair on the a2–g8 diagonal (Bb3).'],
    black: ['Challenge the bishop with ...a6 and ...b5, then complete development with ...d6, ...Be7 and ...O-O.', 'Use ...Na5 to swap the strong bishop, or play ...Re8 and ...Bf8 in the Breyer set-up.', 'Aim for the ...d5 or ...c5 breaks later.'],
    structure: 'Closed centre with e4/e5 pawns facing off. Key squares: d4/d5 for breaks, f5 for White\'s knight route and the e-file for rook play. Plans are slow and manoeuvring.',
    traps: [t('Noah\'s Ark Trap', 'After ...a6 Ba4 d6 d4, Black\'s ...b5 and ...Nxd4 can trap the bishop with ...c5 and ...c4 if White carelessly grabs the pawn on d4.', 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 d6 d4 b5 Bb3 Nxd4 Nxd4 exd4 Qxd4 c5 Qd5 Be6 Qc6+ Bd7 Qd5 c4'), t('Exchange Variation greed', 'If White trades Bxc6 dxc6 and then plays Nxe5?, ...Qd4! forks the knight and e4 and regains the piece.', 'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 Nxe5 Qd4 Nf3 Qxe4+')],
    players: 'Played by almost every world champion, including Bobby Fischer, Anatoly Karpov, Garry Kasparov and Magnus Carlsen.'
  },
  scotch: {
    idea: 'White opens the centre immediately with d4. Instead of the slow manoeuvring of the Ruy Lopez or Italian, the pieces get active at once and the game becomes concrete and tactical.',
    white: ['Recapture on d4 with the knight, then use Nxc6 and e5 to gain space and hit Black\'s pieces with tempo.', 'Develop quickly (Nc3, Be3, Qe2, Bd3) and castle on either side.', 'Look for the Qd4-style centralisation and the half-open d-file.'],
    black: ['Develop with ...Nf6 and ...Bc5 (or ...Bb4+) and hit the d4 knight.', 'Counter in the centre with ...d5, or play ...Qe7 and ...Nd5 after White\'s e5.', 'Black\'s doubled c-pawns after Nxc6 bxc6 give the half-open b-file and central control.'],
    structure: 'After Nxc6 bxc6 e5 White gets a space edge but the e5 pawn can become a target; Black\'s doubled c-pawns are solid but weak on the queenside. Key squares: d5, d4 and e5.',
    traps: [t('Early queen outings', 'Bringing the queen out too soon (...Qh4 or ...Qf6) gives White easy tempo with Nc3 or Nb5.'), t('Allowing e5 at the wrong moment', 'Pushing e5 only works if Black\'s pieces are badly placed; otherwise the pawn becomes a target for ...Qe7 and ...d6.')],
    players: 'Garry Kasparov revived it at the top level in the 1990 world championship match with Karpov. Today it is popular with attacking players who want open positions.'
  },
  najdorf: {
    idea: 'Black plays ...a6 to stop Nb5 and Bb5+, and prepares ...e5 or ...b5. It is the sharpest and most popular Sicilian, with a fight for the centre from move one.',
    white: ['Play the English Attack (Be3, f3, Qd2, O-O-O, g4) to attack the black king.', 'Use Bg5 and f4 for a quick kingside attack, or Be2 for a calm game.', 'Aim for a knight on d5 and use the pressure on the d6 pawn.'],
    black: ['Play ...e5 for a solid centre and ...Be7, or play ...e6 to aim for ...Qc7/...b5/...Bb7.', 'Use ...b5 and ...Bb7 to attack on the queenside, especially if White castles long.', 'Counter on the c-file and the d5 square; don\'t forget the d6 pawn.'],
    structure: 'After ...e5 White gets a knight outpost on d5, while Black\'s d6 pawn is a little weak but his structure is sound. Key squares: d5, b5 and the c-file.',
    traps: [t('The Poisoned Pawn', 'In the Bg5 lines Black can grab ...Qxb2, but it\'s very dangerous: White gets a huge attack with Rb1, Qa3 and Qxa3. Only play it if you know the theory.', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4 Qb6 Qd2 Qxb2 Rb1 Qa3'), t('Slow play against the English Attack', 'If Black plays too slowly (without ...b5 or ...Nbd7) White can storm with g4-g5 and h4.')],
    players: 'It is named after Miguel Najdorf and was a favourite of Bobby Fischer and Garry Kasparov. It is still a main weapon at the highest level.'
  },
  dragon: {
    idea: 'Black fianchettoes the bishop on g7, where it shoots down the long diagonal at White\'s queenside. The opening gets its name from the shape of Black\'s pawns, and it leads to sharp positions with castling on opposite sides.',
    white: ['The Yugoslav Attack: Be3, f3, Qd2, O-O-O, then g4 and h4-h5 to storm Black\'s king.', 'Trade the g7 bishop with Bh6 and aim for Qxh6, mating ideas on the h-file.', 'Be accurate with Nxc6 and Bc4 to blunt Black\'s counterplay.'],
    black: ['Castle, play ...Nc6, ...Bd7 and ...Rc8, then break with ...Nxd4 and ...Rxc3 or ...d5.', 'Use the g7 bishop and open c-file for counterplay on White\'s king.', 'Calculate carefully; both sides are racing against each other.'],
    structure: 'Black has a compact kingside structure of pawns on g6/f7/e7 or e6, but the d6 pawn can be a target. Key squares: the long diagonal a1–h8, the c-file and the squares around the white king.',
    traps: [t('Allowing Bh6', 'If Black lets White exchange on h6 and recapture with the queen, h4-h5 with mating ideas on the h-file comes quickly.'), t('Slow counterplay', 'Black must keep ...Rc8 and ...Nxd4 ready, otherwise White\'s pawn storm arrives first.')],
    players: 'It is named by Fyodor Dus-Chotimirsky, and the Yugoslav Attack was developed in the 1950s. The Dragon is loved by attacking players at every level.'
  },
  french: {
    idea: 'Black prepares ...d5 with a solid ...e6 and challenges White\'s centre from the base of the pawn chain. The Advance Variation (e5) locks the centre and leads to a strategic battle: White has space, Black has targets.',
    white: ['Support the d4 pawn with c3 and Nf3, then use the space for a kingside attack (Bd3, O-O, Ng5 ideas).', 'Meet ...c5 with dxc5 or keep the structure with c3.', 'Keep an eye on the h7 pawn and the Greek gift sacrifice Bxh7+.'],
    black: ['Attack d4 with ...c5, ...Nc6 and ...Qb6.', 'Fight against the e5 pawn with ...f6 and develop the "bad" c8 bishop with ...b6/...Ba6 or ...Bd7.', 'Use ...Na5 and ...c4 to gain queenside space and reduce White\'s centre.'],
    structure: 'A locked pawn chain from d4/e5 vs d5/e6. White has more space on the kingside; Black plays on the queenside. The key squares are d4 (target), the c4/b3 squares and f5/g5 for White\'s knight.',
    traps: [t('Greek Gift', 'If Black castles carelessly, Bxh7+ followed by Ng5 and Qh5 can be devastating.'), t('The bad bishop', 'Black\'s c8 bishop is easily blocked behind the pawn on e6. If it never gets out Black will be stuck.'), t('Grabbing b2', 'Taking the b2 pawn with the queen too early often lets White finish development with a big lead.')],
    players: 'A long-term favourite of Mikhail Botvinnik and Viktor Korchnoi; the Advance Variation was championed by Aron Nimzowitsch and later by Nigel Short.'
  },
  caro: {
    idea: 'Black supports ...d5 with the c-pawn so that the bishop on c8 isn\'t locked in behind ...e6. The Caro-Kann is famous for solidity: a healthy pawn structure, few weaknesses and easy development.',
    white: ['In the Advance Variation White gets space, supports d4 with c3 and plays Be2/O-O or Nbd2.', 'Attack the bishop with h4 or g4 ideas when Black\'s bishop is on f5.', 'Aim for a kingside attack if Black has castled short.'],
    black: ['Get the light-squared bishop out first (...Bf5), then play ...e6, ...c5 and ...Ne7.', 'Break with ...c5 to undermine d4, and trade the white centre pawns.', 'Keep a solid structure and aim for an endgame with a healthy pawn structure.'],
    structure: 'After e5 the pawns are on e5/d4 vs d5/e6/c6 and Black has a sturdy structure with a free bishop. Key squares: d4 (target), c5 (break) and f5 for the bishop.',
    traps: [t('Bishop on f5', 'White can harass the f5 bishop with h4 or g4 in some lines. Make sure your bishop always has a safe retreat square.'), t('Forgetting ...c5', 'If Black doesn\'t challenge d4 in time, White\'s space advantage can become a real bind.')],
    players: 'It is a favourite of Anatoly Karpov, Tigran Petrosian and Mikhail Botvinnik; José Raúl Capablanca also played it. The line in this trainer (Nf3, Be2, Be3) is the "Short Variation", popularised by Nigel Short.'
  },
  qg: {
    idea: 'White offers a pawn with c4 to deflect Black\'s d5 pawn, but if Black takes it White gets a big centre. Black (here with ...e6, the Queen\'s Gambit Declined) holds the d5 pawn and keeps a solid, flexible position.',
    white: ['Develop with Nc3, Bg5, e3 and Nf3, then use Rc1 and Qc2 for pressure on the c-file.', 'In the Exchange Variation, play the minority attack (b4-b5) against Black\'s queenside.', 'Pin the f6 knight to ease ideas like Nd5 or cxd5.'],
    black: ['Complete development with ...Be7, ...O-O and ...Nbd7, then free the position with ...c6, ...dxc4 and ...Nd5/...e5.', 'Use the Lasker break ...Ne4 or the Tartakower ...b6 to simplify.', 'Be careful about the light-squared bishop on c8.'],
    structure: 'Black has a solid pawn on d5 and e6, with the c8 bishop locked in. White\'s pressure is along the c-file and on the d5 pawn. Key squares: d5, c5 and the e4 break.',
    traps: [t('Elephant Trap', 'If White grabs the d5 pawn with Nxd5??, Black wins a piece with ...Nxd5! Bxd8 Bb4+ and ...Kxd8.', 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Nbd7 cxd5 exd5 Nxd5 Nxd5 Bxd8 Bb4+ Qd2 Bxd2+ Kxd2 Kxd8'), t('Cambridge Springs', 'If White plays carelessly after ...Nbd7 and ...c6, ...Qa5 pins the c3 knight to the g5 bishop and wins time.', 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Nbd7 e3 c6 Nf3 Qa5')],
    players: 'One of the oldest, most respected openings. José Raúl Capablanca, Garry Kasparov, Anatoly Karpov and Vladimir Kramnik all trusted it.'
  },
  slav: {
    idea: 'Black supports the d5 pawn with ...c6, keeping the light-squared bishop free to go to f5 before ...e6. The Slav is solid but active: Black can keep the extra pawn or fight for the centre.',
    white: ['Develop with Nf3 and Nc3, then regain the c4 pawn and play e4 or e3.', 'Prevent ...b5 with a4 so that Black can\'t hold the pawn.', 'Use the e4 break for a strong centre or play for a small edge.'],
    black: ['Develop with ...Nf6, ...dxc4, ...Bf5, ...e6, then ...Bb4 and ...O-O or ...Nbd7.', 'Break with ...c5 or ...e5 to equalise.', 'Make sure the c8 bishop is out before ...e6 closes it in.'],
    structure: 'Black has a pawn on c6 and often d5 or a trade on c4. White\'s centre can be strong if Black does not challenge it. Key squares: e4 (break), c4 and e5.',
    traps: [t('Bishop on f5 hit by tactics', 'Careless play can allow Nh4 or Qb3 to hit the f5 bishop and the b7 pawn.'), t('Holding the pawn too long', 'After ...dxc4 Black can\'t keep the extra pawn forever; supporting it with ...b5 is met by a4.')],
    players: 'It has been a main defence for Max Euwe, Alexander Alekhine and Viswanathan Anand among others, and a solid choice for modern elite players.'
  },
  london: {
    idea: 'White builds a solid, easy-to-learn setup (d4, Bf4, e3, Nf3, c3, Bd3) that works against nearly any Black reply. The bishop gets out before the e3 pawn blocks it.',
    white: ['Develop the bishop to f4 first, then play e3, Nf3, c3, Nbd2 and Bd3.', 'Break with e4 or play Ne5 and Qf3/Qb3 to hit the queenside.', 'Castle short and use the pawn chain for a kingside attack.'],
    black: ['Challenge the bishop with ...Bd6 or ...c5, ...Nc6 and ...Qb6 to hit b2.', 'Play ...Nh5 to trade the bishop, or ...e5 to break up the structure.', 'Keep the structure solid and develop quickly.'],
    structure: 'White keeps d4/e3/c3 as a compact pyramid, with the bishop outside the pawn chain. Key squares: e5 for the White knight, b2 (weak), and the c5/d6 diagonal.',
    traps: [t('Loose b2 pawn', 'After Bf4 and e3 the b2 pawn is protected only by the c1 bishop. ...Qb6 forces White to defend it with Qc1, Nbd2-b3 or b3.'), t('Slow Black play', 'If Black develops passively, White gets a free hand for e4 and the attack.')],
    players: 'Hugely popular at club level. Baadur Jobava popularized the sharper Jobava London with Nc3, and elite players use it as a surprise weapon.'
  },
  kid: {
    idea: 'Black lets White build a big centre and then attacks it with ...e5 and ...f5, using the fianchettoed bishop on g7. It leads to complex, imbalanced positions where each side attacks on opposite wings.',
    white: ['Take space with e4, Nf3, Be2 and O-O, then play d5 to close the centre.', 'Use the queenside (c5, b4, Nd2) to break through there while Black attacks the kingside.', 'Or use the Sämisch (f3 and Be3) for a more aggressive set-up.'],
    black: ['Play ...e5, ...Nc6, then ...Ne8 and ...f5 for a kingside attack once the centre is closed.', 'If White doesn\'t close the centre, exchange on d4 and use the g7 bishop.', 'Keep the pieces behind the pawn chain so the structure holds.'],
    structure: 'Closed centre: d5 and e4 pawns vs e5/d6. Both sides attack opposite wings: White on the queenside (c5), Black on the kingside (...f5). Key squares: f5/e4 and c4/c5.',
    traps: [t('Slow attack', 'If Black attacks too slowly, White\'s queenside play (c5) arrives first. Speed matters.'), t('Opening the centre', 'If Black allows White to trade on e5 early, the bishop on g7 loses its advantage.')],
    players: 'A favourite of Bobby Fischer, Garry Kasparov, David Bronstein, Teimour Radjabov and Hikaru Nakamura; the fighting opening for ambitious Black players.'
  },
  nimzo: {
    idea: 'Black pins the knight with ...Bb4 and threatens to double White\'s pawns with ...Bxc3+. It fights for the centre (e4) with pieces instead of pawns and is one of the most respected defences to 1.d4.',
    white: ['Play e3 (the Rubinstein) with Bd3, Nf3, O-O and the bishop pair, accepting doubled pawns if Black takes.', 'Or play Qc2 and a3 to force the bishop decision.', 'Build the centre with e4 and use the two bishops.'],
    black: ['Pin the knight, play ...O-O, ...d5 and ...c5, then take on c3 if it favours Black.', 'Use ...Nc6 and ...Bxc3 to damage White\'s structure.', 'Blockade the doubled pawns and use ...Ne4 hits.'],
    structure: 'Doubled c-pawns for White are a long-term weakness; the compensation is the bishop pair and the centre. Key squares: e4, c4 and d5.',
    traps: [t('Allowing ...Ne4', 'If White plays carelessly, ...Ne4 and ...Bxc3+ can ruin the pawn structure and give Black a good game.'), t('Ignoring the centre', 'If Black lets White set up pawns on e4 and d4, the bishop on b4 may be left offside.')],
    players: 'Named after Aron Nimzowitsch. Garry Kasparov, Anatoly Karpov, Magnus Carlsen and Vladimir Kramnik have played it with success.'
  },
  scandi: {
    idea: 'Black strikes at the e4 pawn on move one and, after exd5 Qxd5, develops the queen early. The queen goes out, but Black gets simple development, no pawn weaknesses and straightforward plans.',
    white: ['Gain time hitting the queen with Nc3 and develop quickly (d4, Nf3, Bc4, Bd2).', 'Use the lead in development and the open lines for an attack.', 'Avoid wasting moves and aim for a safe small advantage.'],
    black: ['Retreat the queen to a5 or d6, then develop with ...Nf6, ...c6, ...Bf5 or ...Bg4.', 'Play ...e6 and ...Bb4 to trade pieces and get a solid game.', 'Don\'t lose tempi; the queen will be hit again.'],
    structure: 'White has a small space advantage and Black has a solid structure with a free c8 bishop. Key squares: d5 (queen), d4 and the e-file.',
    traps: [t('Queen tempo', 'The queen will be hit again after Nc3, so choose a safe square (a5 or d6) and don\'t make a third queen move.'), t('Wasted time', 'Moving the queen several times lets White build a big lead in development.')],
    players: 'One of the oldest openings in chess (1497, Lucena). Sergei Tiviakov is the most famous modern expert.'
  },
  english: {
    idea: 'White starts on the flank with c4, controlling d5 and keeping many options open. It can transpose into many queen\'s pawn openings or become a "reversed Sicilian" after 1...e5.',
    white: ['Develop with Nc3, g3, Bg2, Nf3 and O-O (the fianchetto), then play d3/d4 or a4.', 'Control d5 and use the long diagonal.', 'Use the extra tempo of the "reversed Sicilian".'],
    black: ['Play ...e5 and ...Nf6, then ...d5 to claim the centre.', 'Or choose a symmetrical ...c5 or a Hedgehog ...e6, ...d6, ...b6 set-up.', 'Watch the d5 square and weak light squares.'],
    structure: 'Flexible; it often resembles a Sicilian with the colours reversed. Key squares: d5, d4 and the long diagonal a1–h8.',
    traps: [t('Trading the wrong pieces', 'Careless exchanges on d5 can leave Black with a weak d-pawn or White with a weak d4 square.'), t('Weak light squares', 'If White fianchettoes and then trades its light-squared bishop, the d5 and c4 squares can become weak.')],
    players: 'Mikhail Botvinnik, Garry Kasparov, Anatoly Karpov and Magnus Carlsen have all used the English extensively.'
  },
  catalan: {
    idea: 'White combines the Queen\'s Gambit with a kingside fianchetto: the bishop on g2 pressures the d5 pawn and the long diagonal. Black\'s c4 pawn is often regained later.',
    white: ['Fianchetto, castle and recapture on c4 with the queen or knight.', 'Use the bishop on g2 against d5 and the b7 pawn.', 'Put pressure on the c-file and the queenside.'],
    black: ['Take on c4, then hold it with ...a6/...b5 or give it back for activity with ...c5 and ...Nc6.', 'Complete development with ...Be7, ...O-O and ...Nbd7.', 'Watch the long diagonal.'],
    structure: 'Black has an extra pawn on c4 for a while but White has a long-term pull because of the g2 bishop. Key squares: d5, c4, b7 and the a1–h8 diagonal.',
    traps: [t('Greedy pawn grab', 'Hanging on to the c4 pawn with ...b5 can lose to a4 or the loose pieces on the queenside.'), t('Forgetting the long diagonal', 'The g2 bishop and the queen can pick up the b7 pawn and the rook on a8.')],
    players: 'Named after the Catalan tournament in 1929 for Savielly Tartakower. Vladimir Kramnik and Magnus Carlsen are well-known supporters.'
  },
  pirc: {
    idea: 'Black allows White to build a big centre and then undermines it with pieces and flank pawns. The Pirc is a hypermodern defence that aims for a counterattack rather than occupying the centre early.',
    white: ['Take space with e4, d4, Nc3, Nf3 and Be2, castle and decide between a quiet set-up or an attack (the 150 Attack, Austrian Attack).', 'Attack with f4 and e5 to push Black back.', 'Use the centre to create a kingside attack.'],
    black: ['Fianchetto the bishop on g7, castle, then hit the centre with ...c5, ...e5 or ...Nc6.', 'Counterattack the d4 pawn with ...Bg4 and ...Nc6.', 'Stay flexible and strike when White overextends.'],
    structure: 'White has the broad centre (e4/d4), Black has a compact set-up and the g7 bishop on a long diagonal. Key squares: e5, d4 and the e5 break.',
    traps: [t('Overextension', 'If White pushes e5 before developing, Black can simply take with ...dxe5 and win a pawn.'), t('Passive Black play', 'If Black waits too long, White\'s centre becomes a crushing attack.')],
    players: 'Named after Vasja Pirc (and Dmitry Ufimtsev). It is a favourite of players who like flexible, counterattacking positions.'
  },
  'fried-liver': {
    idea: 'The Fried Liver Attack (or Fegatello) is a sacrificial attack against the Two Knights Defence: White sacrifices a knight on f7 to drag the black king into the open, then follows up with Qf3+ and Nc3 to chase it down.',
    white: ['After 4.Ng5 d5 5.exd5 Nxd5 play 6.Nxf7!? Kxf7 7.Qf3+ Ke6 8.Nc3 with a strong attack (Nb4 9.Qe4).', 'Keep the pressure with Bxd5+ and Qe4 ideas; the black king has no safe place.', 'If Black avoids it with 5...Na5, take the pawn back safely.'],
    black: ['Don\'t allow it: after 5.exd5, play 5...Na5! 6.Bb5+ c6 7.dxc6 bxc6 8.Be2 h6 and keep the extra pawn.', 'If White does sacrifice, defend carefully (...Ke6 and ...Nb4) and look for a counterattack.', 'Remember that 5...Nxd5? is the only move that allows the attack.'],
    structure: 'Open, tactical position with the black king exposed in the middle; the key squares are f7, e6, d5 and e4.',
    traps: [t('The Fried Liver itself', '5...Nxd5? 6.Nxf7! Kxf7 7.Qf3+ Ke6 8.Nc3 gives White a strong attack for the piece. Black should avoid it with 5...Na5.'), t('Best defence (…Na5)', 'After 5.exd5 Na5 White can\'t sacrifice successfully, and Black keeps an extra pawn.', 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5 Bb5+ c6 dxc6 bxc6 Be2 h6 Nf3 e4 Ne5 Bd6')],
    players: 'Mainly seen at club level and in puzzles; strong players choose 5...Na5. It is a good way to learn tactics against an exposed king.'
  },
  traxler: {
    idea: 'The Traxler (Wilkes-Barre) Counter-attack. After 4.Ng5 Black ignores the threat to f7 and plays 4...Bc5!?, leading to crazy tactics: White may grab f7, but Black\'s ...Bxf2+ and ...Nxe4+ give a dangerous attack.',
    white: ['Take on f7 only if you have checked the lines; otherwise play safely with 5.Bxf7+ and return material.', 'Look for the safe path: 5.Nxf7 Bxf2+ 6.Kxf2 Nxe4+ 7.Ke3 is risky; 5.Bxf7+ Ke7 6.Bd5 is simpler.', 'Be ready to defend if Black gets a fast attack.'],
    black: ['Play 4...Bc5!? only if you like tactics and know the lines.', 'After 5.Nxf7 Bxf2+ 6.Kxf2 Nxe4+ continue with ...Qh4+ and attacking ideas.', 'Be ready to sacrifice more pieces to keep the king exposed.'],
    structure: 'Wild and open; the white king may be dragged to e3 or f1. Key squares: f7, f2, e4 and the h4–e1 diagonal.',
    traps: [t('Taking everything', 'Greedy White play can end in disaster after ...Bxf2+ and ...Nxe4+, with the king hunted on e3.'), t('The safe path', 'White can avoid most problems by playing 5.Bxf7+ and returning material.')],
    players: 'Named after the Czech player Karel Traxler. It is mostly played as a surprise weapon by tactically-minded players.'
  },
  'kings-gambit': {
    idea: 'White sacrifices the f-pawn on move two to deflect Black\'s e-pawn and get a big centre and open f-file. It is the most romantic opening: sharp, risky and full of attacking chances.',
    white: ['Develop with Nf3 (to stop ...Qh4+), then Bc4, d4 and castle to use the f-file.', 'Kieseritzky: push h4 to attack the g5 pawn and use Ne5.', 'Aim for a quick attack on f7 and the black king.'],
    black: ['Accept the gambit with ...exf4 and often hold the pawn with ...g5.', 'Counter with ...d5 to open the centre and exploit White\'s weakened king.', 'Be careful about your own king safety after ...g5.'],
    structure: 'White has no f-pawn and an exposed king, but a big centre and open lines. Key squares: f4, f7, e5 and the h4–e1 diagonal.',
    traps: [t('Forgetting Nf3', 'If White plays f4 and misses Nf3, ...Qh4+ (and the loss of castling) can ruin the game.'), t('Greedy ...g5', 'After ...g5 Black must be careful with the h4 push and the Ne5 attack.')],
    players: 'It was the main opening of the Romantic era. Boris Spassky and David Bronstein used it with success; it is still played by attacking players.'
  },
  evans: {
    idea: 'White offers a pawn with b4 to gain time for c3 and d4 and build a big centre. The Evans Gambit is a classic of attacking chess and the home of the famous "Evergreen Game".',
    white: ['Play c3 and d4 to take the centre, with Qb3 and O-O for the initiative.', 'Use the pressure on f7 and the b-file.', 'Aim for a quick attack on the king.'],
    black: ['Accept with ...Bxb4 and retreat the bishop (to a5 or b6) to hold the pawn.', 'Give the pawn back with ...d6 or ...d5 to get a solid position.', 'Develop quickly and castle before White\'s attack arrives.'],
    structure: 'Open centre with White ahead in development. Key squares: f7, d5 and e5.',
    traps: [t('Ignoring f7', 'If Black forgets the pressure on f7, Qb3 and Bxf7+ come quickly.'), t('Slow development', 'Taking too much time (or playing greedily) lets White\'s lead in development become decisive.')],
    players: 'Named after Captain William Evans (1827). Paul Morphy played it, and Garry Kasparov revived it against Anand in 1995.'
  },
  danish: {
    idea: 'White sacrifices two pawns (d4, c3) for a huge lead in development and two bishops pointing at f7 and g7. It is a very sharp opening where White gets a strong attack for the pawns.',
    white: ['After ...dxc3 play Bc4 and recapture on b2 to point both bishops at Black\'s kingside.', 'Use Qb3 to double attack f7 and b7.', 'Develop and castle quickly, attacking before Black consolidates.'],
    black: ['Take the pawns, then return material to defuse the attack: ...d5 is a key idea.', 'Develop quickly and trade queens if possible.', 'Be careful about the f7 and g7 squares.'],
    structure: 'Open centre with two white bishops on open diagonals. Key squares: f7, g7 and the long diagonal.',
    traps: [t('Black\'s equalising idea', 'Black can give the pawns back with ...d5 and reach a solid position.', 'e4 e5 d4 exd4 c3 dxc3 Bc4 cxb2 Bxb2 d5 Bxd5 Nf6 Bxf7+ Kxf7 Qxd8 Bb4+ Qd2 Bxd2+ Nxd2'), t('Forgetting b7 and f7', 'After Qb3 Black must deal with threats to both f7 and b7, usually with ...Qe7 or ...Qd7.')],
    players: 'A rare guest at top level; it is mostly played by attacking players who enjoy a lead in development.'
  },
  'scotch-gambit': {
    idea: 'White offers the d4 pawn for rapid development and attacking chances; the bishop on c4 aims at f7. The sharpest line is the Max Lange Attack.',
    white: ['Develop with Bc4, O-O and e5 (the Max Lange Attack) to hit the f6 knight.', 'Use the open e-file and pressure on f7.', 'Play Ng5 and Nc3 for fast attack.'],
    black: ['Take the pawn and develop with ...Nf6 and ...Bc5.', 'Meet e5 with ...d5! and ...dxc4, then play ...Be6 to block the check.', 'Look for ...Qd5 to hit the white pieces.'],
    structure: 'Open centre with White ahead in development; key squares are e5, f7, d5 and the e-file.',
    traps: [t('Max Lange Attack', 'After 5.O-O Bc5 6.e5 d5 7.exf6 dxc4 8.Re1+ Be6 the position is very sharp: White has pieces aimed at the black king, Black has an extra piece for a while. Know the theory before you play it.'), t('Missing ...Qd5', 'After the Max Lange\'s Ng5 Black must reply ...Qd5! to hit the g5 knight and the g2 pawn; most other moves fall behind in the attack.')],
    players: 'A romantic-era attacking line, popular with players who like open games. Its main line is named the Max Lange Attack after the German master Max Lange.'
  },
  'smith-morra': {
    idea: 'White gives up a pawn with c3 for rapid development, an open c-file attack and a lead in the centre. It is a favourite way to avoid the long theory of the Open Sicilian.',
    white: ['Play Nxc3, Nf3, Bc4 and O-O, then attack with Qe2, Rd1 and e5.', 'Use the pressure on the d-file and the d6 square.', 'Keep developing quickly and make threats before Black consolidates.'],
    black: ['Take the pawn and develop (…Nc6, …d6, …e6, …Nf6, …Be7).', 'Return the pawn at the right time for a solid position.', 'Be careful about ideas like Nb5 and Bxf7+.'],
    structure: 'White has no c-pawn and a lead in development; Black has an extra pawn but weaknesses on d6 and f7. Key squares: d6, d5 and the c-file.',
    traps: [t('Careless queen moves', 'If Black plays ...Qc7 too early, Nb5 can hit d6 and c7.'), t('Early e5', 'White can overreach if the e5 push comes before development is complete.')],
    players: 'Popularised by Pierre Morra and Ken Smith. It is a favourite of club attackers who want to avoid theory.'
  },
  budapest: {
    idea: 'Black sacrifices a pawn right away with ...e5 to get quick piece play, hoping to win the pawn back with ...Ng4 and ...Nc6. It\'s a surprising, tricky defence.',
    white: ['Develop with Bf4, Nf3 and Nc3 and try to keep the extra pawn.', 'Play a3 and e3 for a solid set-up.', 'Be wary of ...Bb4+ and the e5 pawn.'],
    black: ['Take the pawn back with ...Nc6, ...Ngxe5 and ...Bb4+.', 'Use the pins and the doubled c-pawns for counterplay.', 'Stay solid and use the pieces actively.'],
    structure: 'White has an extra pawn but Black has active pieces and often wins it back. Key squares: e5, e4 and the b4–e1 diagonal.',
    traps: [t('Nd3 mate', 'After ...Bb4+ Nbd2 Qe7, if White plays a3? and then grabs the bishop with axb4?? it is mate: ...Nd3#, because the e2 pawn is pinned by the queen on e7.', 'd4 Nf6 c4 e5 dxe5 Ng4 Bf4 Nc6 Nf3 Bb4+ Nbd2 Qe7 a3 Ngxe5 axb4 Nd3#'), t('Ignoring e5', 'If White spends time elsewhere, Black wins the e5 pawn back with ...Nxe5 (or ...f6) and has a comfortable game.')],
    players: 'It first appeared in a 1896 game in Budapest. It\'s a popular surprise choice against 1.d4.'
  },
  benko: {
    idea: 'Black sacrifices a pawn on the queenside (…b5) to open the a- and b-files for rooks and to put the fianchetto bishop on the long diagonal. The compensation is long-lasting.',
    white: ['Accept the pawn and return it at the right moment, keeping a healthy centre.', 'Avoid weakening the king (use g3 and Bg2 instead of e4).', 'Trade queens/pieces to dull Black\'s pressure.'],
    black: ['Play ...a6, ...bxa6 and ...g6, then ...Bxa6, ...d6, ...Nbd7 and ...Rb8 or ...Qa5.', 'Trade the f1 bishop by ...Bxf1 so White can\'t castle (Kxf1).', 'Aim at the b-file and the long diagonal.'],
    structure: 'Black has two queenside pawns less but open files and a strong bishop. Key squares: b2, a1–h8 diagonal, d6 and c4.',
    traps: [t('The ...Bxf1 trick', 'After ...Bxa6 and ...Bxf1 White must recapture with the king or rook and can lose the right to castle, so don\'t drift into that.'), t('Passive White play', 'If White plays too passively, Black\'s pressure on b2 and the queenside gets strong.')],
    players: 'Named after Pal Benko. It\'s a favourite of players who like long-term initiative.'
  },
  albin: {
    idea: 'Black counter-gambits against the Queen\'s Gambit with 2...e5, aiming for a pawn wedge on d4 that cramps White. The pawn on d4 is hard to remove.',
    white: ['Take the pawn and then develop with Nf3, Nbd2 and a3, aiming to blockade d3.', 'Use the extra pawn but be careful about the black pieces.', 'Trade queens (Qxd8+) when Black\'s pressure is highest.'],
    black: ['Push ...d4 and develop with ...Nc6, ...Nge7, ...Nf5 and ...Bg4.', 'Protect the pawn on d4 with ...Nge7-f5 and ...Be6/...Bg4.', 'Look for ...Bb4+ and tactics against the king.'],
    structure: 'Black has an advanced pawn on d4 and good space; White has an extra pawn on e5. Key squares: d4, e3, e5 and d3.',
    traps: [t('Lasker Trap', 'After Bd2 dxe3 Bxb4?? exf2+ Ke2 fxg1=N+! wins the queen (an underpromotion).', 'd4 d5 c4 e5 dxe5 d4 e3 Bb4+ Bd2 dxe3 Bxb4 exf2+ Ke2 fxg1=N+'), t('Letting d4 live', 'If White fails to challenge d4 Black\'s space advantage can be huge.')],
    players: 'Named after Adolf Albin (1893). It\'s a favourite surprise weapon of aggressive players.'
  },
  'englund-black': {
    idea: 'Black plays 1...e5 against 1.d4 to try to catch White in traps. It is unsound if White knows the moves, but it can lead to quick wins against careless play.',
    white: ['Take the pawn: 2.dxe5 Nc6 3.Nf3 Qe7 4.Qd5! is White\'s best.', 'Keep the pawn with a3 and Nc3; don\'t panic about the queen checks.', 'Be careful about the b2 pawn and the a1 rook.'],
    black: ['After 2.dxe5 Nc6 3.Nf3 Qe7 4.Qd5 Qb4+ 5.Nc3 look for tactical chances with ...d6 and ...Qb6.', 'Hope for a mistake: the queen on b4 hits b2.', 'If White plays well, Black is just a pawn down.'],
    structure: 'White has an extra pawn but Black has open lines. Key squares: b2, e5, c3 and the long diagonals.',
    traps: [t('The queen raid', 'Black\'s queen on b4 and b2 can be dangerous if White grabs too much without watching the a1 rook.'), t('The correct response', 'Qd5! with Nc3 and a3 is the best response and keeps the extra pawn.')],
    players: 'Rare at top level; mostly played by club players looking for traps.'
  },
  'englund-white': {
    idea: 'Black plays 1...e5 against 1.d4 to try to catch White in traps. As White you should take the pawn and then play accurately: the Englund is unsound if White knows the moves.',
    white: ['Take the pawn: 2.dxe5 Nc6 3.Nf3 Qe7 4.Qd5! is White\'s best.', 'Keep the pawn with Nc3 and a3; don\'t panic about the queen checks.', 'Be careful about the b2 pawn and the a1 rook.'],
    black: ['After 2.dxe5 Nc6 3.Nf3 Qe7 4.Qd5 Qb4+ 5.Nc3 look for tactical chances with ...d6 and ...Qb6.', 'Hope for a mistake: the queen on b4 hits b2.', 'If White plays well, Black is just a pawn down.'],
    structure: 'White has an extra pawn but Black has open lines. Key squares: b2, e5, c3 and the long diagonals.',
    traps: [t('The queen raid', 'Black\'s queen on b4 and b2 can be dangerous if White grabs too much without watching the a1 rook.'), t('The correct response', 'Qd5! with Nc3 and a3 is the best response and keeps the extra pawn.')],
    players: 'Rare at top level; mostly played by club players looking for traps.'
  },
  stafford: {
    idea: 'After 1.e4 e5 2.Nf3 Nf6 3.Nxe5 Nc6!? Black sacrifices a pawn (the Stafford Gambit) for quick development and traps. It is a "trappy" gambit that became popular online.',
    white: ['Take the knight with Nxc6 dxc6 and play d3, then develop sensibly (Be2, O-O).', 'Avoid the traps: don\'t grab everything and don\'t forget about ...Bc5, ...Ng4.', 'Keep the pawn and trade pieces.'],
    black: ['Develop quickly with ...Bc5, ...O-O and ...Bg4 or ...Ng4/...Qh4.', 'Use the open lines for the attack.', 'Remember you are a pawn down, so go for it.'],
    structure: 'White has an extra pawn; Black has open diagonals and quick development. Key squares: f2, g4 and h4.',
    traps: [t('The ...Ng4 / ...Qh4 attack', 'After ...Bc5 and ...Ng4, White must not grab the wrong pawn: Black threatens ...Bxf2+ and ...Qh4 and wins quickly if White is careless.'), t('Playing too slow', 'If White plays sensible developing moves, Black\'s compensation fades quickly.')],
    players: 'Popularised online by Eric Rosen. It is a classic example of a trappy, surprise opening.'
  },
  'vienna-gambit': {
    idea: 'White develops the knight to c3 and plays f4, like a King\'s Gambit but with the knight developed. After ...d5 there is a sharp fight in the centre and White gets quick development.',
    white: ['Play f4, Nf3 and Qe2 to put pressure on the e4 knight.', 'Develop quickly and castle.', 'Use the open f-file and the central tension.'],
    black: ['Play ...Nf6 and ...d5 to claim the centre.', 'Capture on e4 with ...Nxe4 and trade pieces to relieve the pressure.', 'Be careful about your king in the centre.'],
    structure: 'Open centre; the key squares are e4, d5, f7 and f4.',
    traps: [t('Overlooking Qe2', 'After ...Nxe4 and Qe2 Black must be careful about pins and discovered attacks.'), t('Dropping the e5 pawn', 'After fxe5 Nxe4 White must be careful about the pin on the e-file and about Qh5 ideas.')],
    players: 'Popular with sharp attacking players. It has a long history among Vienna club players.'
  },
  qga: {
    idea: 'Black accepts the Queen\'s Gambit pawn with ...dxc4 and plans to return it at the right time for a free game. It\'s a solid, positional option.',
    white: ['Regain the pawn with Nf3, e3 and Bxc4, then castle and play Qe2/Rd1.', 'Use the extra space and the isolated d-pawn ideas.', 'Aim for a small, lasting advantage.'],
    black: ['Develop with ...Nf6, ...e6, ...c5, ...a6 and ...b5 to hold the pawn or return it.', 'Fianchetto the queen\'s bishop with ...b5 and ...Bb7.', 'Equalise by trading pieces.'],
    structure: 'Black gives up the d5 pawn; White often gets an isolated queen\'s pawn for Black. Key squares: d4, c5 and the long diagonal.',
    traps: [t('Holding the pawn too long', 'Trying to keep the extra pawn with ...b5 can be met by a4 and Bxc4.'), t('Ignoring development', 'Black has to finish development quickly or White\'s space advantage will tell.')],
    players: 'A reliable choice used by players of all levels who want an equal, solid game.'
  },
  latvian: {
    idea: 'After 1.e4 e5 2.Nf3 f5 Black plays the Latvian (Greco) Gambit: an aggressive attempt to take the initiative. It is very risky and rarely played above club level.',
    white: ['Take on e5, play d4 and Nc4, then develop with Nc3.', 'Avoid the traps and keep an extra pawn.', 'Use the f-file and Qh5+ ideas carefully.'],
    black: ['Hit the knight with ...Qf6 and play ...d6 and ...fxe4.', 'Develop with ...Nc6 and ...Qg6 to build an attack.', 'Look for tactical chances.'],
    structure: 'Sharp and open; White has an extra pawn but weaknesses on the kingside. Key squares: e5, e4, f7 and g2.',
    traps: [t('Queen tricks', 'The queen on f6 and g6 can create threats against g2 and the loose pieces.'), t('Greedy White play', 'If White grabs everything, the attack on the kingside can become dangerous.')],
    players: 'Also known as the Greco Counter-Gambit; played by adventurous players.'
  },
  'blackmar-diemer': {
    idea: 'White sacrifices a pawn with e4 to gain quick development and attacking chances against Black\'s king. After ...dxe4 Nc3 Nf6 f3 exf3 Nxf3 White has a big lead.',
    white: ['Develop quickly with Nc3, f3, Nxf3, Bg5 and Bd3.', 'Aim for h7 with Bd3 and Qe2 and look for Ne5 ideas.', 'Castle and attack the black king.'],
    black: ['Take the pawns and defend with ...e6, ...Be7 and ...Nc6.', 'Return material at the right time to remove the attack.', 'Don\'t be afraid of the attack; defend accurately.'],
    structure: 'Open centre with an extra pawn for Black and a lead in development for White. Key squares: e5, h7 and f7.',
    traps: [t('Bd3 and Qe2', 'If Black ignores the pressure on h7 a quick Bxh7+ or Ne5 attack can win.'), t('Overextending', 'If White plays too fast without developing, Black can return the pawns and keep an extra piece in the middlegame.')],
    players: 'Named after Armand Blackmar and Emil Josef Diemer; Diemer promoted it for decades.'
  },
  halloween: {
    idea: 'White sacrifices a knight on e5 in the Four Knights Game (the Halloween Gambit) to dislodge Black\'s centre and gain space with d4 and e5. It is a sharp, rare surprise.',
    white: ['Sacrifice the knight, play d4 and e5 to push the black pieces back.', 'Develop with Bc4 and Qf3 for pressure on f7.', 'Aim for a big centre and an attack.'],
    black: ['Take the knight, then retreat and hold the extra piece.', 'Defend f7 and develop with ...Bb4.', 'Don\'t panic; Black is a piece up and should be fine.'],
    structure: 'White has a big centre and the initiative, but Black is a piece up. Key squares: e5, f7 and g8.',
    traps: [t('Leaving the knight', 'If Black retreats badly the pieces get cramped and tactics appear.'), t('Not being accurate', 'White must keep up the pressure or the missing piece will tell.')],
    players: 'Very rare; played as a surprise weapon.'
  },
  jerome: {
    idea: 'After 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 White sacrifices a bishop on f7 (the Jerome Gambit) to drag the black king out. It is unsound against best play but a fun surprise.',
    white: ['Play Bxf7+ Kxf7 Nxe5+ to attack.', 'Follow up with Qh5+ and look for tactics.', 'Keep playing actively; you have two pawns for the piece.'],
    black: ['Take the pieces, return material and consolidate (...Kf8, ...Qe7, ...Qf7).', 'Hold the extra piece and trade queens.', 'Calculate carefully and don\'t panic.'],
    structure: 'White has two pawns for a piece and an exposed black king. Key squares: f7, e5 and h5.',
    traps: [t('Greedy Black play', 'If Black overlooks the attack the black king can get into trouble.'), t('Trading queens', 'Black should trade queens to make White\'s lost piece count.')],
    players: 'Named after the American amateur Alonzo Wheeler Jerome (1870s). Popular as a curiosity.'
  },
  schliemann: {
    idea: "After 1.e4 e5 2.Nf3 Nc6 3.Bb5 Black plays 3...f5, the Schliemann or Jaenisch Gambit. Instead of the slow Ruy Lopez set-ups, Black attacks e4 immediately and fights for the initiative. It is sharp, unusual and sound enough to be used even by strong players.",
    white: ["Play 4.Nc3 and after ...fxe4 5.Nxe4 develop calmly; the knight on e4 is strong if Black plays ...d5 carelessly.", "Look for the tactical shot Nxe5 with ideas of Nxc6 and discovered checks from the b5 bishop.", "Do not be afraid of 4.d4 or 4.Bxc6: simple development gives White a comfortable game."],
    black: ["Take on e4 and play ...d5 or ...Nf6 to challenge the knight, then develop fast.", "Use the open f-file: ...Qf6, ...Be7 and ...O-O aim at the white king's side.", "After 4.exf5 play ...e4 to harass the knight and take the centre."],
    structure: "Open and tactical: the f-file is half-open for Black, e4 and e5 are the key squares, and the b5 bishop and c6 knight are often traded. Black's king usually castles quickly to avoid tricks.",
    traps: [t("Discovered check on a7", "In the main line after ...Qg5 Qe2 Nf6, Nxa7+ is a discovered check from the b5 bishop and wins a pawn and more if Black is careless with the king.", "e4 e5 Nf3 Nc6 Bb5 f5 Nc3 fxe4 Nxe4 d5 Nxe5 dxe4 Nxc6 Qg5 Qe2 Nf6 Nxa7+ Kd8"), t("Grabbing too much with Bxc6 and Nxe5", "After 4.d4 fxe4 5.Bxc6 dxc6 6.Nxe5 Black has the bishop pair and quick development, so White should not expect an easy extra pawn.", "e4 e5 Nf3 Nc6 Bb5 f5 d4 fxe4 Bxc6 dxc6 Nxe5 Nf6 Bg5 Be7 Nc3")],
    players: "Named after the 19th-century players Schliemann and Jaenisch, who analysed 3...f5; it is popular with attacking club players and has been used as a surprise weapon by strong grandmasters."
  },
  marshall: {
    idea: "In the Ruy Lopez Black plays ...d5 on move 8 after White's slow c3, sacrificing the e5 pawn for a big lead in development and a powerful attack. It was invented by Frank Marshall in 1918 and has been a hugely respected weapon ever since.",
    white: ["Take the pawn with Nxe5 and Rxe5 and then consolidate with d4 and Re1.", "Neutralise the attack: many players avoid the Marshall with Anti-Marshall systems like 8.a4 or 8.h3.", "Be ready to return the pawn if needed and trade queens."],
    black: ["Sacrifice the pawn, then play ...Nf6, ...c6, ...Bd6 and ...Qh4 to attack.", "Keep the queen near the king: ...Qh3 and ...Bg4 are the key attacking moves.", "Don't rush; the initiative is long-lasting and can last into the endgame."],
    structure: "White has an extra pawn but little development on the kingside; Black has bishops on d6 and g4 and a queen aiming at h3. Key squares: e5, f4, g2 and h2.",
    traps: [t("Careless defence", "If White plays slowly after 12.d4 Bd6 13.Re1 Qh4 14.g3 Qh3, Black's pieces swarm the king with ...Bg4 and ...Rae8, and White must find accurate defence.", "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5 exd5 Nxd5 Nxe5 Nxe5 Rxe5 c6 d4 Bd6 Re1 Qh4 g3 Qh3 Qe2 Bg4"), t("The Steiner 9...e4", "In the Steiner Variation Black pushes ...e4 and ...exf3 and ...fxg2 for a wild attack; White has extra material and the Qf3 resource to defend, so know the theory before trying it.", "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5 exd5 e4 dxc6 exf3 d4 fxg2")],
    players: "Named after the American champion Frank Marshall, who held it back for years until he sprang it on Capablanca; today it is a main line at the top level."
  },
  "icelandic-palme": {
    idea: "After 1.e4 d5 2.exd5 Nf6 3.c4 Black plays 3...e6, the Icelandic Gambit. Black offers a pawn for quick development, an open e-file and tricks.",
    white: ["Take on e6, then develop with Nf3, d4 and Qe2; the extra pawn is worth keeping if you stay calm.", "Decline with 4.Nc3 or 4.d3 for a quieter game.", "Trade queens if Black gets too active."],
    black: ["Take back on e6 with the bishop and develop with ...Qe7, ...Nc6 and ...O-O-O.", "Use the e-file and the long diagonal to pressure White's king and queen.", "Play for tricks such as ...Bb4+ to gain tempi."],
    structure: "White has the d5 pawn and often a space edge; Black has quick development and open lines. Key squares: e6, e4, d4 and the e-file.",
    traps: [t("Careless d4", "In the line 4.dxe6 Bxe6 5.d4 Black gets in ...Bb4+ and ...Qe7 with a pleasant game, so White should be careful with development.", "e4 d5 exd5 Nf6 c4 e6 dxe6 Bxe6 d4 Bb4+ Bd2 Bxd2+ Qxd2 Qe7 Qe3"), t("Overreaching with Nf3", "After 4.Nf3 exd5 5.cxd5 Nxd5 Black's knight and bishop quickly harass White's pieces and Black has an active position.", "e4 d5 exd5 Nf6 c4 e6 Nf3 exd5 cxd5 Nxd5 Nc3 Nb4 d4 Bf5")],
    players: "A rare, fashionable surprise weapon against the Scandinavian, popular with players who like early tactics."
  },
  elephant: {
    idea: "After 1.e4 e5 2.Nf3 Black plays 2...d5, the Elephant (or Queen's Pawn Counter) Gambit. Black ignores the attack on e5 and strikes in the centre, offering a pawn for activity. It is unsound but loaded with early traps.",
    white: ["Take the pawn with 3.exd5 and develop with Nc3 and d4; the extra pawn is yours.", "Be careful of ...e4 hitting the knight: Qe2 or Ne5 are good replies.", "Do not rush captures; make sure your pieces are developed."],
    black: ["Play ...e4 (Paulsen) to harass the knight, then ...Nf6 and ...Be7 and castle.", "Try ...Bd6 (Maroczy) to guard e5 and develop quickly.", "Look for tricks when White's queen is on the e-file."],
    structure: "Black has less material but quick development and central space; the e-file is the main battle zone. Key squares: e4, d5, e5 and f3.",
    traps: [t("Qe2 and the pin", "After 3.exd5 e4 4.Qe2 Nf6 White's queen on the e-file can become a target; if White carelessly plays Nc3 and Nxe4 Black regains the pawn with ...Nxd5 and gets quick development.", "e4 e5 Nf3 d5 exd5 e4 Qe2 Nf6 Nc3 Be7 Nxe4 Nxd5"), t("Nxe5 and the wasp sting", "In the Wasp Variation, 3.Nxe5 dxe4 4.Bc4 Qg5 5.d4 Qxg2 looks greedy for Black: 6.Bxf7+ and Rf1 give White a strong attack, so Black needs to know when to stop grabbing pawns.", "e4 e5 Nf3 d5 Nxe5 dxe4 Bc4 Qg5 d4 Qxg2 Bxf7+ Kd8 Rf1")],
    players: "A rare opening, often used as a surprise by club players; the named lines honour Louis Paulsen and Géza Maróczy, who tried them in the 19th and early 20th centuries."
  },
  "von-hennig-schara": {
    idea: "After 1.d4 d5 2.c4 e6 3.Nc3 c5 4.cxd5 Black plays 4...cxd4!?, the Von Hennig-Schara (Schara) Gambit. White's queen takes the pawn, but Black gains time hitting it with the knight and bishop.",
    white: ["Take on d4 with the queen but retreat it to d1 and keep the extra pawn.", "Play simple development with e3, Bd2 and Be2, and trade queens if you can.", "Avoid pushing e4 too early or you may drop material."],
    black: ["Recapture on d5 with a pawn, then play ...Be6 and ...Rd8 for a lead in development.", "Use the open d-file and a quick ...Nf6 and ...Bg7 or ...Bd6.", "Trade queens: Black's activity is worth the pawn."],
    structure: "White has an extra pawn, but Black has active pieces and the d-file. Key squares: d5, d4, c3 and the d-file.",
    traps: [t("Greedy queen", "After 5.Qxd4 Nc6 White's queen must retreat; if it goes to d1 and then grabs on d5, Black continues with ...Be6 and gains time.", "d4 d5 c4 e6 Nc3 c5 cxd5 cxd4 Qxd4 Nc6 Qd1 exd5 Qxd5 Be6"), t("Nb5 and ...Nf6", "After 5.Nb5 Nf6 White's knight is far away and Black takes the initiative with ...Qa5+ and ...Nc6.", "d4 d5 c4 e6 Nc3 c5 cxd5 cxd4 Nb5 Nf6 Qxd4 Qa5+")],
    players: "Named after von Hennig and Schara, two early 20th-century players who tried it; it remains a favourite of Black players who like activity over material."
  },
  rousseau: {
    idea: "After 1.e4 e5 2.Nf3 Nc6 3.Bc4 Black plays 3...f5, the Rousseau (or Italian) Gambit. Black attacks e4 at once, but weakens the king; against calm play the gambit is unsound but very tricky.",
    white: ["Take the pawn on e5 or e4 and develop with Nc3 and d3; keep the king safe.", "Be careful of ...Qh4 ideas; the f-file is open for Black.", "Use the bishop on c4 and Ng5 to aim at f7 and h7."],
    black: ["Play ...fxe4 and ...Nf6 to attack the e4 pawn and open lines.", "Try ...Nxe5 tricks if White grabs on e5.", "Look for ...Qh4+ and ...Bc5 to attack the f2 square."],
    structure: "Open and risky; Black's king has weaknesses on e8 and g8. Key squares: e5, e4, f7 and f2.",
    traps: [t("Don't take on e5 too quickly", "4.Nxe5? Nxe5 5.d4 looks like a clever fork, but the knight simply takes the bishop with 5...Nxc4 and Black is a piece (or more) up.", "e4 e5 Nf3 Nc6 Bc4 f5 Nxe5 Nxe5 d4 Nxc4"), t("Bxg8 trick", "The wild 4.d4 fxe4 5.Ng5 d5 6.Bb3 Nxd4! line looks scary, but Black comes out ahead if he keeps finding the natural captures.", "e4 e5 Nf3 Nc6 Bc4 f5 d4 fxe4 Ng5 d5 Bb3 Nxd4 Nxe4 dxe4 Qh5+ Kd7")],
    players: "Named after a 19th-century player called Rousseau; it is a rare club opening used for surprise."
  },
  fajarowicz: {
    idea: "After 1.d4 Nf6 2.c4 e5 3.dxe5 Black plays 3...Ne4 instead of the Budapest ...Ng4. This is the Fajarowicz Gambit: Black gets quick piece play and tactics like ...Bb4+ and ...Qe7.",
    white: ["Play 4.a3 to stop ...Bb4+ and develop with Nf3, Nbd2 or Qc2.", "Watch for ...Bb4+ and ...Qe7 tricks before developing the queenside knight.", "Keep the extra pawn and trade pieces."],
    black: ["Use ...Bb4+, ...Qe7 and ...Nc5 to recover the pawn.", "Keep the knight active: ...Ne4 and ...Nc6 build pressure.", "Sacrifice a second pawn if it opens lines."],
    structure: "White has an extra pawn on e5; Black has quick development and tactical chances. Key squares: e4, e5, f2 and c3.",
    traps: [t("4.Nf3 Bb4+", "After 4.Nf3 Bb4+ 5.Bd2 Nxd2 6.Nbxd2 Black regains the e5 pawn soon with ...d6 and gets a comfortable game.", "d4 Nf6 c4 e5 dxe5 Ne4 Nf3 Bb4+ Bd2 Nxd2 Nbxd2 Be7 e3 d6"), t("Qc2 and ...Bb4+", "4.Qc2 Bb4+ 5.Nc3 d5 gives Black good play, with the e5 pawn under pressure and White's queen exposed to knight tricks.", "d4 Nf6 c4 e5 dxe5 Ne4 Qc2 Bb4+ Nc3 d5")],
    players: "Named after the Polish player Leon Fajarowicz; it is a rare line used by tricky players in blitz."
  },
  blumenfeld: {
    idea: "After 1.d4 Nf6 2.c4 e6 3.Nf3 c5 4.d5 Black plays 4...b5!?, the Blumenfeld Countergambit. Black offers a pawn to win the centre with ...d5 and ...e5, often getting a strong pawn centre.",
    white: ["Accept with dxe6 and cxb5, then develop with Nc3 and e4 to challenge the centre.", "Decline with Bg5, e4 or g3 if you don't want to fight for the pawn.", "Be ready to return the pawn to calm the position."],
    black: ["Take back on e6 and play ...d5 for a strong centre with ...Nbd7 and ...e5.", "Use the half-open f-file and play ...Bb7 to hit the long diagonal.", "Keep the pawn centre protected and avoid overextending."],
    structure: "Black gets a big pawn centre (d5/e5) for a pawn; White gets the c- and b-files. Key squares: d5, e5, e6 and e4.",
    traps: [t("Greedy cxb5", "After 5.dxe6 fxe6 6.cxb5 d5 Black's centre grows quickly; if White plays slowly with Nc3 and e4 it can lead to complications.", "d4 Nf6 c4 e6 Nf3 c5 d5 b5 dxe6 fxe6 cxb5 d5 Nc3 Nbd7 e4 d4 e5 Ng4"), t("Duz-Khotimirsky Bg5", "After 5.Bg5 exd5 6.cxd5 h6 7.Bxf6 Qxf6 material is level and Black has the bishop pair and active play.", "d4 Nf6 c4 e6 Nf3 c5 d5 b5 Bg5 exd5 cxd5 h6 Bxf6 Qxf6 Qc2")],
    players: "Named after Benjamin Blumenfeld, a Russian master of the early 20th century who championed it."
  },
  "wing-gambit": {
    idea: "After 1.e4 c5 White plays 2.b4!?, the Wing Gambit. The b-pawn deflects Black's c-pawn so White can build a big centre with e4 and d4, and use the a- and b-files.",
    white: ["After ...cxb4 play a3 to open lines and develop with Bb2, Nf3 and d4.", "Look for the e5 break and use the bishop on the long diagonal.", "Be ready to recover the pawns with axb4."],
    black: ["Take the pawn and play ...d5 to hit the centre.", "Return material if needed and play ...e6 and ...Nf6.", "Don't greedily take both pawns without developing."],
    structure: "White gets open a- and b-files and a strong centre for the pawns; Black has extra pawns. Key squares: d4, e5, b4 and a3.",
    traps: [t("The Marienbad ...d5", "In the Marienbad Variation 4.exd5 Qxd5 5.Bb2 e5 6.Nf3 Black is a pawn up, but White's development and open lines give strong attacking chances.", "e4 c5 b4 cxb4 a3 d5 exd5 Qxd5 Bb2 e5 Nf3 Nf6 axb4 Bxb4 Bxe5"), t("Declined with ...Nf6", "After 2...Nf6 3.e5 Nd5 4.Bb2 Nxb4 White gets a quick lead in development with c3 and d4.", "e4 c5 b4 Nf6 e5 Nd5 Bb2 Nxb4 c3 N4c6 d4 e6")],
    players: "The named variations (Marienbad, Carlsbad, Abrahams, Santasiere) honour places and players that tested it in the 20th century; it is a popular surprise weapon at club level."
  },
  "goring-gambit": {
    idea: "In the Scotch Game 1.e4 e5 2.Nf3 Nc6 3.d4 exd4, White plays 4.c3!?, the Goring Gambit. White offers a pawn (or two) to gain a big centre, open lines and quick development.",
    white: ["After ...dxc3 play Nxc3 and Bc4 or Bd3 and castle quickly.", "Aim your pieces at f7 and the e-file; use e5 and Qb3.", "If Black returns the pawn, enjoy the central space."],
    black: ["Take the pawn on c3 and play ...Bb4 or ...Nf6 to challenge White's development.", "Return the pawns at the right time (for example with ...d6 and ...Nf6) to blunt the attack.", "Watch the d-file and the f7 square once your king is still in the centre."],
    structure: "White has a lead in development and central control but is a pawn (or two) down. Key squares: e5, d5 and f7.",
    traps: [t("Bishop pin on the knight", "In the main line Black pins the c3 knight with ...Bb4; if White plays Bd3 and O-O he gets a strong outpost with Nd5.", "e4 e5 Nf3 Nc6 d4 exd4 c3 dxc3 Nxc3 Bb4 Bd3 Nge7 O-O O-O Nd5"), t("Double pawn sacrifice", "After 5.Bc4 cxb2 6.Bxb2 White has open lines and a big lead in development.", "e4 e5 Nf3 Nc6 d4 exd4 c3 dxc3 Bc4 cxb2 Bxb2 Bb4+ Nc3 Nf6 e5 d5")],
    players: "Named after Carl Göring, a German chess master of the 19th century; it was a favourite of attacking amateurs in the Romantic era."
  },
  "staunton-gambit": {
    idea: "After 1.d4 f5 White plays 2.e4!?, the Staunton Gambit. After 2...fxe4 3.Nc3 Nf6 4.Bg5 White pins the knight and usually regains the pawn with a nice lead in development.",
    white: ["Develop with Nc3, Bg5 and Nxe4, then continue with Nf3 and Bd3.", "Look for Bxf6 and Nxf6+ ideas and a good knight on e5.", "Aim for the kingside with Qg4 or h4."],
    black: ["Defend e4 with ...Nf6 and ...e6, then complete development.", "Try the Alekhine (...g6) or Chigorin (...c6) set-ups to keep the pawn.", "Return the pawn when needed and play ...d5."],
    structure: "White has a big centre and quick development; Black may keep the extra pawn if he plays carefully. Key squares: e4, e5, g5 and f6.",
    traps: [t("Bg5 pin", "If Black ignores Bg5 and plays ...e6 and ...Be7, White regains the pawn on e4 and gets a better game.", "d4 f5 e4 fxe4 Nc3 Nf6 Bg5 e6 Nxe4 Be7 Bxf6 Bxf6 Nf3"), t("Alekhine h4", "After 4...g6 5.h4 d5 6.h5 White gets good attacking chances on the kingside.", "d4 f5 e4 fxe4 Nc3 Nf6 Bg5 g6 h4 d5 h5 Bf5")],
    players: "Named after Howard Staunton, the English champion of the 1840s; a favourite way to fight the Dutch for attacking players."
  },
  "muzio-gambit": {
    idea: "In the King's Gambit Accepted White plays 3.Nf3 g5 4.Bc4 g4 5.O-O!? the Muzio Gambit: after ...gxf3 White has given a knight for an open f-file and a ferocious attack. It's famous, spectacular and risky.",
    white: ["Take on f3 with the queen, aim bishop and queen at f7 and bring the rook to f1.", "Use e5 and d3 to open the position and attack.", "Look for Bxf7+ ideas if Black's king is exposed."],
    black: ["Accept the knight and play ...Qf6 or ...Qe7 to defend f7.", "Give back the extra material when needed and consolidate with ...d6 and ...Bh6.", "Try the Brentano (...d5) idea to counterattack."],
    structure: "White has an open f-file and a big lead in development; Black has an extra piece. Key squares: f7, f4, f3 and the e-file.",
    traps: [t("Qf6 and e5", "After 6...Qf6 7.e5 Qxe5 8.d3 Bh6 White has given a knight, but Black's king is stuck in the centre and Bd2, Nc3 and Rae1 pile on.", "e4 e5 f4 exf4 Nf3 g5 Bc4 g4 O-O gxf3 Qxf3 Qf6 e5 Qxe5 d3 Bh6"), t("From's Defence 6...Qe7", "Black's 6...Qe7 looks natural, but 7.Qxf4 Qc5+ 8.Rf2 attacks with tempo and White regains material with strong threats; Black must know the theory.", "e4 e5 f4 exf4 Nf3 g5 Bc4 g4 O-O gxf3 Qxf3 Qe7 Qxf4 Qc5+")],
    players: "A Romantic-era favourite found in the oldest King's Gambit analysis; still popular with attacking players in blitz."
  },
  "belgrade-gambit": {
    idea: "In the Four Knights Scotch (1.e4 e5 2.Nf3 Nc6 3.Nc3 Nf6 4.d4 exd4) White plays 5.Nd5!?, the Belgrade Gambit. The knight jumps into the centre, attacks f6, c7 and e7, and White may give a pawn for quick attacks.",
    white: ["Attack the knight on e4 with Qe2 and Nd2 to pin it against the king.", "Follow with Nxd4 or Nb4 ideas to win material if Black errs.", "Be prepared to trade queens or take the pawn back."],
    black: ["Take on e4 with the knight, defend with ...f5 and kick the queen with ...d3.", "Exchange the knight on d5 with ...Nxd5 and play ...Qe7+.", "Do not take on e4 without knowing the line: 5...Be7 and 5...Nxd5 are safer."],
    structure: "Open centre with tactical play; the e-file pin is the central theme. Key squares: e4, d5, d4 and e2.",
    traps: [t("The pinned knight", "After 5...Nxe4 6.Qe2 the knight on e4 is pinned against the king: Black must defend it with ...f5 and cannot simply retreat it, and 6...Qe7?? loses the queen to Nxe7.", "e4 e5 Nf3 Nc6 Nc3 Nf6 d4 exd4 Nd5 Nxe4 Qe2 f5 Nd2 d3"), t("Nxd5 Qe7+", "After 5...Nxd5 6.exd5 Qe7+ White has a pleasant game with Be2, Nxd4 and Nb5.", "e4 e5 Nf3 Nc6 Nc3 Nf6 d4 exd4 Nd5 Nxd5 exd5 Qe7+ Be2 Ne5 Nxd4")],
    players: "Named after the city of Belgrade; it remains a rare, tricky weapon at club level."
  },
};
