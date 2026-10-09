/* =====================================================================
   ADAM & ALVY: everything on the page comes from here.
   Add a memory, a photo or a letter by editing this file only; the
   layout never needs to change. (A .js file rather than .json so the
   page still works when opened straight from disk.)
   ===================================================================== */
window.US = {
  names: ['Adam', 'Alvy'],

  // The day she said yes. Drives the counter, the monthiversaries and the anniversaries.
  since: '2026-09-27T00:00:00+08:00',

  // Optional soft gate: a question only she would know. This keeps casual visitors
  // out but it is NOT real security (the page and photos are public on GitHub).
  // To turn it on, open the page, run  usHash('the answer')  in the browser console
  // and paste the number below. Answers are compared lowercase, spaces trimmed.
  gate: null,
  // gate: { question: 'what title did we fight about?', hash: 0 },

  prologue: 'Somewhere along the way you became my favourite part of every day.',

  // The film Alvy made for our first date. The heart of this site: it gets its
  // own section, right after the prologue. `tribute` is Adam's words under it.
  film: {
    src: 'video/our-first-date.mp4', poster: 'video/our-first-date.jpg',
    title: 'Our First Date', by: 'Alvy', date: '26 September 2026', edition: 'Brown Formal Edition', length: '1:18',
    quote: 'I’m looking forward to the day when I don’t have to introduce you as someone I’m getting to know, but as my partner.',
    after: 'and the very next day, I asked you to be exactly that ♡',
    // TODO Adam: a draft in your voice. Rewrite it in your own words.
    tribute: [
      'You made this for our first date. A whole film, from you, about us.',
      'Nobody has ever made anything like this for me. Every slide, every word, every little flower: you put your whole heart into it.',
      'It is genuinely the sweetest thing anyone has ever made for me, and it made me love you so, so, so much.',
    ],
    sign: 'thank you, sayang. forever grateful,',
  },

  // Our story, oldest first. `when` is free text so a fuzzy date is fine.
  // `photo` (optional) shows as a small polaroid beside the moment.
  story: [
    { when: 'The beginning', title: 'Your very first thread post', place: 'Threads',
      text: 'I stumbled onto it, and ever since then all I have wanted is to be yours.' },
    { when: '21 September 2026', title: 'The first I love you', place: 'You said it first',
      text: 'You said it first. I have been saying it back ever since.' },
    { when: '26 September 2026', title: 'Our first date', place: 'Four Seasons, Tanjung Malim',
      photo: 'photos/2026-09-26-first-date/31.jpg',
      links: [{ href: '#film', text: 'Her film' }, { href: '#dates', text: 'The memo' }],
      text: 'Your first date ever, and the first of thousands. Malatang at Four Seasons, a Grab to Watsons, flowers from me, and then Mama and Baba sent you home: the first time you met them.' },
    { when: '27 September 2026', title: 'The letter', place: 'be_mine.html', tag: 'You said yes', link: '../be_mine.html', linkText: 'Open it',
      text: 'An envelope, a capybara, and one very important question. You said yes.' },
    { when: '29 September 2026', title: 'The surprise dinner', place: 'Safa Restaurant', link: '#dates', linkText: 'The memo',
      photo: 'photos/2026-09-29-second-date/14.jpg',
      text: 'A surprise dinner with Mama and Baba to celebrate my gaji naik. So proud I akhirnya got to belanja you makan heehheehe. They gave you two kuali to masak with, and we held hands for the first time.' },
    { when: '2 October 2026', title: 'My kawan baik di Tanjung Malim', place: 'According to Mama',
      text: 'Mama called you my "kawan baik di Tanjung Malim" heehee. A very, very good friend indeed.' },
    { when: '3 October 2026', title: 'Nenek called you cute', place: 'Nenek approved ♡',
      photo: 'photos/2026-10/01.jpg',
      text: 'Nenek saw your photo from class and said you are comel. She is right, of course. Now it is official.' },
    { when: '4 October 2026', title: 'Our third date', place: 'KL Sentral to Surian, by MRT', link: '#dates', linkText: 'The memo',
      text: 'All in black, formal. Brunch, photos, a movie and bowling.' },
  ],

  // Date memos, oldest first. Every field is optional. `theme.color` is the swatch.
  // agenda: a list of stops; a stop can have `items` under it.
  // checklist ticks are remembered on the device; `done: true` ticks one by default.
  // photos: a few polaroids pinned to the bottom of the memo.
  dates: [
    {
      title: 'First date', date: '2026-09-26', emoji: '🤎',
      theme: { name: 'Brown, formal', color: '#6b4632' },
      place: 'Four Seasons, Tanjung Malim',
      agendaLabel: 'Aktiviti',
      agenda: [
        { text: 'Makan malatang' },
        { text: 'Gift exchange 🎁' },
        { text: 'Gift unboxing 🎀' },
      ],
      checklist: [
        { text: 'Tripod', done: true },
        { text: 'Powerbank', done: true },
        { text: 'Gift masing-masing', done: true },
        { text: 'DIY bag', done: true },
      ],
      note: 'and then: a Grab to Watsons, flowers for you, and Mama and Baba sending you home. the first time you met them ♡',
      photos: ['photos/2026-09-26-first-date/26.jpg', 'photos/2026-09-26-first-date/33.jpg', 'photos/2026-09-26-first-date/22.jpg'],
    },
    {
      title: 'Second date', date: '2026-09-29', emoji: '🤍',
      theme: { name: 'Surprise', color: '#f4ece6' },
      place: 'Safa Restaurant',
      type: 'Surprise dinner for my gaji naik',
      note: 'I came with Mama and Baba. So proud I akhirnya got to belanja you makan heehheehe. They gave you two kuali to masak with, and we held hands for the first time ♡',
      photos: ['photos/2026-09-29-second-date/10.jpg', 'photos/2026-09-29-second-date/14.jpg', 'photos/2026-09-29-second-date/21.jpg'],
    },
    {
      title: 'Third date', date: '2026-10-04', emoji: '🖤',
      theme: { name: 'Black, formal', color: '#121012' },
      type: 'MRT date',
      agendaLabel: 'Agenda',
      agenda: [
        { text: 'Jumpa di KL Sentral 🚉' },
        { text: 'NU Sentral 🥐', items: ['Pusing-pusing', 'Brunch together'] },
        { text: 'MRT to Surian 🚇' },
        { text: 'Photo date 📸', items: ['Photobooth', 'BookXcess', 'Rooftop photos together'] },
        { text: 'Movie 🎬', items: ['Tengok movie together'] },
        { text: 'Bowling 🎳', items: ['Juara Bowling Alley @ Strand Mall'] },
      ],
      checklist: [
        { text: 'Powerbank' },
        { text: 'Tripod' },
        { text: 'Touch ’n Go topup' },
        { text: 'Black formal outfit 🖤' },
      ],
    },
  ],

  // The Reel: chapters of polaroids, oldest first. Each photo: src, caption (under
  // the photo), note (on the back, tap to flip), favourite: true (shown bigger).
  // The note above the reel types itself out while you move through that chapter.
  chapters: [
    {
      title: 'Before the dates',
      note: 'before the dates: the very first picture you ever sent me, and you, being proud-worthy as always.',
      photos: [
        { src: 'photos/before/39.jpg', caption: 'the first pic of me',  note: 'the very first picture of me you ever sent me hehe' },
        { src: '../be_mine/2.jpeg',    caption: 'my favourite',         note: 'the day you nicknamed me "suami idaman" AHAHAHAH' },
        { src: '../be_mine/3.jpeg',    caption: 'that smile tho',       note: 'this one lives rent-free in my head' },
        { src: '../be_mine/8.jpeg',    caption: 'my cutie ♡',           note: 'my favourite face in the whole world' },
        { src: '../be_mine/7.jpeg',    caption: 'so proud of you',      note: 'look at you up there, i’ll always be proud of you' },
        { src: 'photos/before/02.jpg', caption: 'penat, still cute',    note: 'you look so penat here, and still the prettiest one in the photo' },
        { src: 'photos/before/03.jpg', caption: 'me at the symposium', note: 'me at the symposium hehehe' },
        { src: 'photos/before/23.jpg', caption: 'segak, apparently',    note: 'your favourite photo of me, the one you said i look segak in eheheh' },
      ],
    },
    {
      title: 'First date · 26 September',
      note: 'our first date: malatang at Four Seasons, a Grab to Watsons, my flowers, and meeting Mama and Baba for the first time.',
      photos: [
        { src: 'photos/2026-09-26-first-date/40.jpg', caption: 'otw ♡',               note: 'otw to our first date ehhehhehe' },
        { src: 'photos/2026-09-26-first-date/26.jpg', caption: 'before the date',     note: 'taken before our date, and you look stunning' },
        { src: 'photos/2026-09-26-first-date/32.jpg', caption: 'malatang at 4 seasons', note: 'our first date, over malatang at Four Seasons' },
        { src: 'photos/2026-09-26-first-date/33.jpg', caption: 'feat. capybara',      note: 'malatang at Four Seasons, featuring the capybara in my bag' },
        { src: 'photos/2026-09-26-first-date/34.jpg', caption: 'you & malatang',      note: 'malatang at Four Seasons' },
        { src: 'photos/2026-09-26-first-date/35.jpg', caption: 'gorgeous',            note: 'you look gorgeous here. and sayang, you deleted the candid one before this 😤' },
        { src: 'photos/2026-09-26-first-date/38.jpg', caption: 'alololololo',         note: 'alololololo omelnya dia, ayunya dia ♡' },
        { src: 'photos/2026-09-26-first-date/29.jpg', caption: 'grab to watsons',    note: 'in the Grab to Watsons' },
        { src: 'photos/2026-09-26-first-date/30.jpg', caption: 'still in the grab',   note: 'in the Grab to Watsons' },
        { src: 'photos/2026-09-26-first-date/31.jpg', caption: 'forever',             note: 'in the Grab to Watsons. you were so stunningly gorgeous, i wanted to be with you forever the moment i took this', favourite: true },
        { src: 'photos/2026-09-26-first-date/27.jpg', caption: 'in Baba’s car',       note: 'in Baba’s car, on the way to send you home. the first time you met Mama and Baba' },
        { src: 'photos/2026-09-26-first-date/22.jpg', caption: 'my flowers ♡',        note: 'right after our first date, with the flowers i gave you' },
        { src: 'photos/2026-09-26-first-date/25.jpg', caption: 'you + flowers',       note: 'right after our first date, with the flowers i gave you' },
        { src: 'photos/2026-09-26-first-date/28.jpg', caption: 'posted ♡',            note: 'you posted these right after our first date, with my flowers' },
      ],
    },
    {
      title: 'Second date · 29 September',
      note: 'a surprise dinner for my gaji naik: Mama and Baba, two kuali for you, and the first time we held hands.',
      photos: [
        { src: 'photos/2026-09-29-second-date/04.jpg', caption: 'waiting',              note: 'so gorgeous here, waiting for Mama and Baba' },
        { src: 'photos/2026-09-29-second-date/05.jpg', caption: 'still waiting',        note: 'so gorgeous here, waiting for Mama and Baba' },
        { src: 'photos/2026-09-29-second-date/10.jpg', caption: 'the love of my life',  note: 'the most gorgeous woman to have ever existed. literally the love of my life', favourite: true },
        { src: 'photos/2026-09-29-second-date/08.jpg', caption: 'by Mama',              note: 'Mama took this photo of us' },
        { src: 'photos/2026-09-29-second-date/11.jpg', caption: 'by Mama, again',       note: 'Mama took this one too' },
        { src: 'photos/2026-09-29-second-date/17.jpg', caption: 'and again ♡',          note: 'Mama could not stop taking photos of us' },
        { src: 'photos/2026-09-29-second-date/14.jpg', caption: 'my whole family',      note: 'my whole family and the love of my life, at one table' },
        { src: 'photos/2026-09-29-second-date/07.jpg', caption: 'with me hehe',         note: 'hehehe, with me' },
        { src: 'photos/2026-09-29-second-date/06.jpg', caption: 'after the date',       note: 'gorgeous, after the date' },
        { src: 'photos/2026-09-29-second-date/16.jpg', caption: 'outside your house',   note: 'right outside your house, sebelum kena jerit HAHAHAHAHA' },
        { src: 'photos/2026-09-29-second-date/20.jpg', caption: 'cute',                 note: 'outside your house sebelum kena jerit, and you look so cute' },
        { src: 'photos/2026-09-29-second-date/21.jpg', caption: 'omel',                 note: 'omel, right outside your house, sebelum kena jerit HAHAHAHAHA' },
      ],
    },
    {
      title: 'October 2026',
      note: 'after the dates: you at class, cantik meletops, in the photo that made Nenek say comel.',
      photos: [
        { src: 'photos/2026-10/01.jpg', caption: 'cantik meletops', note: 'you at class, gorgeous. this is the photo Nenek saw when she said you are comel ♡' },
      ],
    },
    // Next: { title: 'Third date · 4 October', note: '...', photos: [ ... ] },
  ],
  // Blank polaroids at the end of the reel. New photos push them further along.
  yetToBeMade: 5,

  // Letters. `body` is a list of paragraphs. A letter with no body shows as sealed.
  // `photos` (optional) are scattered around the letter when it opens; leave it out
  // to use every photo from the reel.
  letters: [
    {
      title: 'The letter that started it', from: 'Adam', to: 'Alvy', date: '27 September 2026',
      sign: 'yours, now and forever,',
      link: '../be_mine.html', linkText: 'read the whole letter',
      body: [
        'Ever since I stumbled onto your very first thread post, all I have wanted is to be yours, and my heart still feels that way every single day.',
        'Somewhere along the way you became my favourite part of every day. Your voice is my comfort, and hearing it is the sweetest way to unwind at the end of a long day.',
        'That date was only the first of thousands of dates, and the first of millions of memories I want to make with you.',
      ],
    },
    { title: 'Open when you miss me',      from: 'Adam', to: 'Alvy', sealed: 'still being written' },
    { title: 'Open when you can’t sleep',  from: 'Adam', to: 'Alvy', sealed: 'still being written' },
    { title: 'Open when we fight',         from: 'Adam', to: 'Alvy', sealed: 'still being written' },
    { title: 'Your turn',                  from: 'Alvy', to: 'Adam', sealed: 'waiting for your words' },
  ],

  // Promises from the letter. Set done: true when one is kept for good.
  promises: [
    { text: 'one day I will buy you things without you ever feeling guilty, because I am your man and I will be your provider' },
    { text: 'I will be there for you, all the time' },
    { text: 'I will be the one you call when you have a nightmare' },
    { text: 'I will never be mad at you like the me in that dream you had before our first date' },
  ],

  // Things to do together. A starter list: edit freely.
  bucket: [
    { text: 'a hundred more photos like the ones in the reel' },
    { text: 'malatang, again and again' },
    { text: 'our first trip, just the two of us' },
    { text: 'build our own zoo together, with real live capybaras 🍊' },
    { text: 'open a sanctuary for stray dogs' },
    { text: 'let you do my makeup, full glam, no complaints 💄' },
    { text: 'the great waxing competition after our wedding: cabut bulu, whoever says sakit first kalah hahahaha' },
    { text: 'triplets. she wanted twins, now she wants triplets, so triplets it is 😂 👶👶👶' },
  ],

  // Our future home, as specified by Alvy: a dollhouse seen from the front, top floor
  // first. art: the little drawing in the room (crib, adamStudy, safaStudy, bath, gym,
  // kitchen, door). wide: how much wider than a normal room. her: her words.
  // wishes: tick them off when the real house has them.
  home: {
    name: 'Rumah Adam & Alvy',
    floors: [
      [
        { id: 'triplet-1', name: 'Triplet 1', art: 'crib', her: 'tiga bilik anak, for the triplets', wishes: [{ text: 'a room of their own' }] },
        { id: 'triplet-2', name: 'Triplet 2', art: 'crib', her: 'tiga bilik anak, for the triplets', wishes: [{ text: 'a room of their own' }] },
        { id: 'triplet-3', name: 'Triplet 3', art: 'crib', her: 'tiga bilik anak, for the triplets', wishes: [{ text: 'a room of their own' }] },
      ],
      [
        { id: 'bedroom', name: 'Bilik tidur', art: 'bedroom', wide: 1.2,
          adam: 'our room, connected straight to the bilik mandi',
          wishes: [{ text: 'connected to the bilik mandi' }] },
        { id: 'bath', name: 'Bilik mandi', art: 'bath', wide: 1.4, her: 'ada bathtub, and asing from the children',
          adam: 'and an omnidirectional shower: water from every side (tap the room to run it)',
          wishes: [{ text: 'a bathtub' }, { text: 'separate from the children' }, { text: 'an omnidirectional shower' }] },
      ],
      [
        { id: 'study-adam', name: 'Bilik study Adam', art: 'adamStudy', wide: 1.2, her: 'ada bilik study me',
          adam: 'multiple screens, a bit messy, filled with books and wires, and a window',
          wishes: [{ text: 'a study for Adam' }, { text: 'multiple screens' }, { text: 'a window' }, { text: 'books (and wires) everywhere' }] },
        { id: 'study-safa', name: 'Bilik study Safa', art: 'safaStudy', wide: 1.8,
          her: 'mini library, coffee machine, and a couch. susunan buku kena menegak and mendatar',
          adam: 'and a study table for her',
          wishes: [{ text: 'a mini library' }, { text: 'books standing up and lying down' }, { text: 'a coffee machine' }, { text: 'a couch' }, { text: 'a study table' }] },
      ],
      [
        { id: 'kitchen', name: 'Dapur', art: 'kitchen', wide: 1.5, her: 'ada oven and microwave', wishes: [{ text: 'an oven' }, { text: 'a microwave' }] },
        { id: 'gym', name: 'Bilik gym', art: 'gym', her: 'bilik gym', wishes: [{ text: 'a home gym' }] },
        { id: 'door', name: 'Pintu depan', art: 'door', wide: .8, note: 'welcome home ♡' },
      ],
    ],
  },

  // Countdowns on top of the automatic ones (next monthiversary, next anniversary,
  // and any upcoming date memo).
  // date: 'YYYY-MM-DD' or a full ISO date. Past dates hide themselves.
  countdowns: [
    // { label: 'Next date', date: '2026-10-10' },
  ],

  // Songs that remind me of us, played from the record. The one marked `reel: true`
  // is the crank's music box: it plays while the reel moves.
  // src: an mp3 in us/songs/. A song with no file but a `link` (Spotify, YouTube)
  // opens the link instead. `note` is the handwritten line beside it.
  songs: [
    { title: 'Stuck with U', artist: 'Ariana Grande & Justin Bieber', src: 'songs/stuck-with-u.mp3', note: 'our song ♡' },
    { title: 'Kota Ini Tak Sama Tanpamu', artist: 'Nadhif Basalamah', src: 'songs/kota-ini-tak-sama-tanpamu.mp3', note: '' },
    { title: 'Semua Aku Dirayakan', artist: 'Nadin Amizah', src: 'songs/semua-aku-dirayakan.mp3', note: '', reel: true },
    // { title: '', artist: '', src: 'songs/....mp3', note: '' },
    // { title: '', artist: '', link: 'https://open.spotify.com/track/...', note: '' },
  ],
  // the record crackle layered under whatever is playing
  crackle: 'songs/vinyl.mp3',
};
