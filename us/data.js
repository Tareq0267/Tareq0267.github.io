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

  // Our story, oldest first. `when` is free text so a fuzzy date is fine.
  story: [
    { when: 'The beginning', title: 'Your very first thread post', place: 'Threads',
      text: 'I stumbled onto it, and ever since then all I have wanted is to be yours.' },
    { when: 'Somewhere in between', title: 'The Ottoman Empire debate', place: 'Our longest argument',
      text: 'A whole fight over the right title for the Ottoman Empire. Only you could turn a history debate into one of my favourite memories.' },
    { when: '21 September 2026', title: 'The first I love you', place: 'You said it first',
      text: 'You said it first. I have been saying it back ever since.' },
    { when: '26 September 2026', title: 'Our first date', place: 'Four Seasons Steamboat, Tanjung Malim', link: '#dates', linkText: 'The memo',
      text: 'Your first ever date, and the first of thousands. Steamboat, a gift exchange and a very careful unboxing, all in brown.' },
    { when: '27 September 2026', title: 'The letter', place: 'be_mine.html', tag: 'You said yes', link: '../be_mine.html', linkText: 'Open it',
      text: 'An envelope, a capybara, and one very important question. You said yes.' },
    { when: '29 September 2026', title: 'The surprise date', place: 'Safa Restaurant', link: '#dates', linkText: 'The memo',
      text: 'I turned up after your work with Mam and Baba. So proud I akhirnya get to belanja you makan heehheehe.' },
    { when: '4 October 2026', title: 'Our third date', place: 'KL Sentral to Surian, by MRT', link: '#dates', linkText: 'The memo',
      text: 'All in black, formal. Brunch, photos, a movie and bowling.' },
  ],

  // Date memos, oldest first. Every field is optional. `theme.color` is the swatch.
  // agenda: a list of stops; a stop can have `items` under it.
  // checklist ticks are remembered on the device; `done: true` ticks one by default.
  dates: [
    {
      title: 'First date', date: '2026-09-26', emoji: '🤎',
      theme: { name: 'Brown, formal', color: '#6b4632' },
      place: 'Four Seasons Steamboat, Tanjung Malim',
      agendaLabel: 'Aktiviti',
      agenda: [
        { text: 'Makan' },
        { text: 'Gift exchange 🎁' },
        { text: 'Gift unboxing 🎀' },
      ],
      checklist: [
        { text: 'Tripod', done: true },
        { text: 'Powerbank', done: true },
        { text: 'Gift masing-masing', done: true },
        { text: 'DIY bag', done: true },
      ],
    },
    {
      title: 'Second date', date: '2026-09-29', emoji: '🤍',
      theme: { name: 'Surprise', color: '#f4ece6' },
      place: 'Safa Restaurant',
      type: 'Surprise date, after your work',
      note: 'I came with Mam and Baba. So proud I akhirnya get to belanja you makan heehheehe.',
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
  // the photo), note (on the back, tap to flip). The note above the reel types
  // itself out while you move through that chapter.
  chapters: [
    {
      title: 'September 2026',
      note: 'the month everything started: the first I love you, the first date, and your yes.',
      photos: [
        { src: '../be_mine/1.jpeg', caption: 'us ♡',              note: 'the day i’ll remember forever' },
        { src: '../be_mine/2.jpeg', caption: 'my favourite',      note: 'the day you nicknamed me "suami idaman" AHAHAHAH' },
        { src: '../be_mine/3.jpeg', caption: 'that smile tho',    note: 'this one lives rent-free in my head' },
        { src: '../be_mine/4.jpeg', caption: 'more of these pls', note: 'let’s make a hundred more of these' },
        { src: '../be_mine/5.jpeg', caption: 'us again ♡',        note: 'my favourite seat is always the one next to you' },
        { src: '../be_mine/6.jpeg', caption: 'pretty, as always', note: 'how is one person this pretty?' },
        { src: '../be_mine/7.jpeg', caption: 'so proud of you',   note: 'look at you up there, I’ll always be proud of you' },
        { src: '../be_mine/8.jpeg', caption: 'my cutie ♡',        note: 'this face lives rent-free in my head' },
      ],
    },
    // Next: { title: 'October 2026', note: '...', photos: [ ... ] },
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
    { text: 'settle the Ottoman Empire title debate once and for all' },
    { text: 'see the Hagia Sophia together' },
    { text: 'a hundred more photos like the ones in the reel' },
    { text: 'malatang, again and again' },
    { text: 'our first trip, just the two of us' },
  ],

  // Countdowns on top of the automatic ones (next monthiversary, next anniversary,
  // and any upcoming date memo).
  // date: 'YYYY-MM-DD' or a full ISO date. Past dates hide themselves.
  countdowns: [
    // { label: 'Next date', date: '2026-10-10' },
  ],

  // Songs that remind me of us. The first one also plays while the reel moves.
  // src: an mp3 in us/songs/. A song with no file but a `link` (Spotify, YouTube)
  // opens the link instead. `note` is the handwritten line beside it.
  songs: [
    { title: 'Semua Aku Dirayakan', artist: 'Nadin Amizah', src: 'songs/semua-aku-dirayakan.mp3', note: 'our song ♡' },
    // { title: '', artist: '', src: 'songs/....mp3', note: '' },
    // { title: '', artist: '', link: 'https://open.spotify.com/track/...', note: '' },
  ],
  // the record crackle layered under whatever is playing
  crackle: '../vinyl.mp3',
};
