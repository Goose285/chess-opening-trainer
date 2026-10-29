// Built-in opening library. Each opening has several named lines (SAN, no move numbers).
// Lines are merged into a position graph (by FEN), so branches and transpositions share book moves.
import { GAMBITS } from './gambits.js';

const CLASSICAL = [
  {
    id: 'italian', name: 'Italian Game', eco: 'C50–C54', side: 'white',
    blurb: 'Classical development aiming at f7: Giuoco Piano, Evans Gambit and the Two Knights.',
    lines: [
      { name: 'Giuoco Pianissimo', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a6 Bb3 Ba7' },
      { name: 'Giuoco Piano, Greco Attack', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5 exd5 Nxd5 Qb3 Nce7 O-O O-O' },
      { name: 'Evans Gambit', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 d6 Qb3 Qd7 dxe5 Bb6' },
      { name: 'Two Knights, Knight Attack', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5 Bb5+ c6 dxc6 bxc6 Be2 h6 Nf3 e4 Ne5 Bd6 d4 exd3 Nxd3 Qc7' },
      { name: 'Two Knights, Quiet 4.d3', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7 O-O O-O Re1 d6 c3 a6 Bb3 Na5' },
    ],
  },
  {
    id: 'ruy', name: 'Ruy Lopez', eco: 'C60–C99', side: 'white',
    blurb: 'The Spanish: pressure on the e5 pawn via the c6 knight. Closed, Marshall, Berlin and Exchange.',
    lines: [
      { name: 'Closed, Breyer Variation', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Nb8 d4 Nbd7' },
      { name: 'Closed, Marshall Attack', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5 exd5 Nxd5 Nxe5 Nxe5 Rxe5 c6 d3 Bd6 Re1 Bf5' },
      { name: 'Berlin Defence', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8 Nc3 Ke8 h3 Bd7' },
      { name: 'Exchange Variation', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4 exd4 Nxd4 c5 Nb3 Qxd1 Rxd1 Bg4 f3 Be6' },
    ],
  },
  {
    id: 'scotch', name: 'Scotch Game', eco: 'C44–C45', side: 'white',
    blurb: 'White opens the centre at once with 3.d4. Open, direct and well-theorised.',
    lines: [
      { name: 'Mieses Variation', moves: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5 Qe7 Qe2 Nd5 c4 Ba6' },
      { name: 'Classical, 4...Bc5', moves: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Nb3 Bb6 a4 a6 Nc3 Nf6' },
      { name: 'Scotch Four Knights', moves: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nc3 Bb4 Nxc6 bxc6 Bd3 d5 exd5 cxd5 O-O O-O Bg5 c6' },
    ],
  },
  {
    id: 'najdorf', name: 'Sicilian: Najdorf', eco: 'B90–B99', side: 'black',
    blurb: 'Fischer and Kasparov\'s weapon: ...a6 gives Black flexible, counter-attacking play.',
    lines: [
      { name: 'English Attack', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6 f3 Be7 Qd2 O-O O-O-O Nbd7 g4 b5' },
      { name: '6.Bg5, Classical', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4 Be7 Qf3 Qc7 O-O-O Nbd7' },
      { name: '6.Bg5, Poisoned Pawn', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4 Qb6 Qd2 Qxb2 Rb1 Qa3' },
      { name: '6.Be2, Opocensky', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7 O-O O-O Be3 Be6' },
      { name: '6.Bc4, Fischer-Sozin', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bc4 e6 Bb3 b5 O-O Be7' },
    ],
  },
  {
    id: 'dragon', name: 'Sicilian: Dragon', eco: 'B70–B79', side: 'black',
    blurb: 'Black fianchettos a bishop on the long diagonal. Sharp, with opposite-side castling battles.',
    lines: [
      { name: 'Yugoslav Attack, 9.Bc4', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6 Bc4 Bd7 O-O-O Rc8 Bb3 Ne5 Kb1' },
      { name: 'Yugoslav Attack, 9.O-O-O d5', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6 O-O-O d5 exd5 Nxd5 Nxc6 bxc6 Bd4 e5 Bc5 Be6' },
      { name: 'Classical, 6.Be2', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be2 Bg7 Be3 Nc6 O-O O-O Nb3 Be6 f4' },
    ],
  },
  {
    id: 'french', name: 'French Defence', eco: 'C00–C19', side: 'black',
    blurb: 'Solid ...e6 and ...d5. Black accepts a cramped position for a sturdy pawn chain and counterplay.',
    lines: [
      { name: 'Advance Variation', moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 a3 c4 Nbd2 Na5' },
      { name: 'Winawer, Poisoned Pawn', moves: 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7 Qg4 Qc7 Qxg7 Rg8 Qxh7 cxd4 Ne2 Nbc6 f4 Bd7' },
      { name: 'Classical, 4.Bg5', moves: 'e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7 e5 Nfd7 Bxe7 Qxe7 f4 O-O Nf3 c5 Qd2 Nc6 O-O-O' },
      { name: 'Tarrasch, Closed', moves: 'e4 e6 d4 d5 Nd2 Nf6 e5 Nfd7 Bd3 c5 c3 Nc6 Ne2 cxd4 cxd4 f6 exf6 Nxf6 O-O Bd6' },
      { name: 'Exchange Variation', moves: 'e4 e6 d4 d5 exd5 exd5 Nf3 Nf6 Bd3 Bd6 O-O O-O Bg5 Bg4' },
    ],
  },
  {
    id: 'caro', name: 'Caro-Kann Defence', eco: 'B10–B19', side: 'black',
    blurb: 'Rock-solid: ...c6 prepares ...d5 while keeping the light-squared bishop free.',
    lines: [
      { name: 'Advance Variation, Short', moves: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 Be3 cxd4 Nxd4 Ne7' },
      { name: 'Classical, 4...Bf5', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7 Bd3 Bxd3 Qxd3 e6 Bf4 Qa5+' },
      { name: 'Exchange Variation', moves: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6 Bf4 Bg4 Qb3 Qd7 Nd2 e6' },
      { name: 'Panov Attack', moves: 'e4 c6 d4 d5 exd5 cxd5 c4 Nf6 Nc3 e6 Nf3 Be7 cxd5 Nxd5 Bd3 Nc6 O-O O-O Re1' },
    ],
  },
  {
    id: 'qg', name: "Queen's Gambit", eco: 'D06–D69', side: 'white',
    blurb: 'Declined, Accepted, Exchange and Tarrasch lines of the most classical 1.d4 opening.',
    lines: [
      { name: 'QGD Orthodox, 7.Rc1', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7 Rc1 c6 Bd3 dxc4 Bxc4 Nd5 Bxe7 Qxe7' },
      { name: 'QGD Exchange', moves: 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 c6 e3 Be7 Bd3 Nbd7 Qc2 O-O Nge2 Re8 O-O Nf8' },
      { name: 'QGD Tartakower', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6 cxd5 Nxd5 Bxe7 Qxe7 Nxd5 exd5 Rc1 Be6' },
      { name: "Queen's Gambit Accepted", moves: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 Qe2 b5 Bb3 Bb7 Rd1 Nbd7' },
      { name: 'Tarrasch Defence', moves: 'd4 d5 c4 e6 Nc3 c5 cxd5 exd5 Nf3 Nc6 g3 Nf6 Bg2 Be7 O-O O-O Bg5 cxd4 Nxd4 h6 Be3 Re8' },
    ],
  },
  {
    id: 'slav', name: 'Slav & Semi-Slav', eco: 'D10–D19', side: 'black',
    blurb: 'Defend d5 with ...c6, keeping the bishop out before ...e6. Rich, resilient and ambitious.',
    lines: [
      { name: 'Slav, Main Line', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4 O-O Nbd7 Qe2 Bg6' },
      { name: 'Slav Exchange', moves: 'd4 d5 c4 c6 cxd5 cxd5 Nc3 Nf6 Bf4 Nc6 e3 Bf5 Nf3 e6' },
      { name: 'Semi-Slav, Moscow', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 Bg5 h6 Bh4 dxc4 e4 g5 Bg3 b5 Be2 Bb7' },
      { name: 'Semi-Slav, Meran', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3 dxc4 Bxc4 b5 Bd3 a6 e4 c5' },
    ],
  },
  {
    id: 'london', name: 'London System', eco: 'D02, A46', side: 'white',
    blurb: 'A flexible, low-theory setup: Bf4, e3, Nf3, c3 against almost anything.',
    lines: [
      { name: 'vs ...c5 setup', moves: 'd4 d5 Bf4 Nf6 e3 e6 Nf3 c5 c3 Nc6 Nbd2 Bd6 Bg3 O-O Bd3 b6' },
      { name: 'vs ...Bf5 / ...c5', moves: 'd4 d5 Bf4 c5 e3 Nc6 c3 Nf6 Nd2 e6 Ngf3 Bd6 Bg3 O-O Bd3' },
      { name: 'vs King\'s Indian setup', moves: 'd4 d5 Bf4 Nf6 e3 g6 Nf3 Bg7 h3 O-O Be2 c5 c3 Nc6 Nbd2 Qb6' },
      { name: 'vs 1...Nf6 / ...g6', moves: 'd4 Nf6 Bf4 g6 e3 Bg7 Nf3 O-O Be2 d6 h3 Nbd7 O-O c5 c3 b6' },
    ],
  },
  {
    id: 'kid', name: "King's Indian Defence", eco: 'E60–E99', side: 'black',
    blurb: 'Black lets White build a big centre, then strikes with ...e5 or ...c5 and a kingside attack.',
    lines: [
      { name: 'Classical, Mar del Plata', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7 Ne1 Nd7 Be3 f5' },
      { name: 'Petrosian System', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 d5 a5 Bg5 h6 Bh4 Na6 Nd2 Qe8' },
      { name: 'Sämisch Variation', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 e5 Nge2 c6 Qd2 Nbd7 O-O-O a6' },
      { name: 'Fianchetto Variation', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 g3 O-O Bg2 d6 Nf3 Nbd7 O-O e5 e4 c6 h3 Qb6' },
    ],
  },
  {
    id: 'nimzo', name: 'Nimzo-Indian Defence', eco: 'E20–E59', side: 'black',
    blurb: 'Pin the knight with ...Bb4 and fight for e4. Strategically rich and very respected.',
    lines: [
      { name: 'Rubinstein, 4.e3', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 c5 O-O Nc6 a3 Bxc3 bxc3 dxc4 Bxc4 Qc7' },
      { name: 'Classical, 4.Qc2', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O a3 Bxc3+ Qxc3 b6 Bg5 Bb7 e3 d6' },
      { name: 'Sämisch, 4.a3', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 a3 Bxc3+ bxc3 c5 e3 Nc6 Bd3 O-O Ne2 b6 e4 Ne8' },
      { name: 'Three Knights, 4.Nf3', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Nf3 c5 e3 Nc6 Bd3 Bxc3+ bxc3 d6 e4 e5' },
    ],
  },
  {
    id: 'scandi', name: 'Scandinavian Defence', eco: 'B01', side: 'black',
    blurb: 'Challenge e4 immediately with 1...d5. Easy to learn, with natural development.',
    lines: [
      { name: 'Main Line, 3...Qa5', moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6 Bc4 Bf5 Bd2 e6 Qe2 Bb4' },
      { name: '3...Qd6', moves: 'e4 d5 exd5 Qxd5 Nc3 Qd6 d4 Nf6 Nf3 a6 g3 Nc6' },
      { name: 'Modern, 2...Nf6', moves: 'e4 d5 exd5 Nf6 d4 Nxd5 Nf3 g6 Be2 Bg7 O-O O-O c4 Nb6 Nc3 Nc6' },
    ],
  },
  {
    id: 'english', name: 'English Opening', eco: 'A10–A39', side: 'white',
    blurb: '1.c4: a flexible flank opening. Reversed Sicilian, Symmetrical and Botvinnik-style setups.',
    lines: [
      { name: 'Reversed Sicilian, 4 Knights', moves: 'c4 e5 Nc3 Nf6 Nf3 Nc6 g3 d5 cxd5 Nxd5 Bg2 Nb6 O-O Be7 a3 O-O b4 Be6' },
      { name: 'King\'s English, ...g6', moves: 'c4 e5 Nc3 Nc6 g3 g6 Bg2 Bg7 d3 d6 Nf3 f5 O-O Nf6' },
      { name: 'Symmetrical', moves: 'c4 c5 Nc3 Nf6 g3 d5 cxd5 Nxd5 Bg2 Nc7 Nf3 Nc6 O-O e5' },
    ],
  },
  {
    id: 'catalan', name: 'Catalan Opening', eco: 'E01–E09', side: 'white',
    blurb: 'Queen\'s Gambit + fianchetto: long-diagonal pressure on c6/b7 and the queenside.',
    lines: [
      { name: 'Open Catalan', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O dxc4 Qc2 a6 a4 Bd7 Qxc4 Bc6' },
      { name: 'Closed Catalan', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O c6 Qc2 Nbd7 Nbd2 b6' },
    ],
  },
  {
    id: 'pirc', name: 'Pirc Defence', eco: 'B07–B09', side: 'black',
    blurb: 'A hypermodern defence: let White occupy the centre, then undermine it with ...c5 or ...e5.',
    lines: [
      { name: 'Classical', moves: 'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2 O-O O-O Bg4 Be3 Nc6' },
      { name: 'Austrian Attack', moves: 'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 O-O Bd3 Na6 O-O c5' },
      { name: '150 Attack', moves: 'e4 d6 d4 Nf6 Nc3 g6 Be3 c6 Qd2 b5 f3 Nbd7' },
    ],
  },
];

// Classical openings first, then the gambit category (o.gambit === true).
export const OPENINGS = [...CLASSICAL, ...GAMBITS];
