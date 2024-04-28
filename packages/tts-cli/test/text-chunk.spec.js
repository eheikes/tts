const { chunkText, splitIntoSentences } = require('../lib/text-chunk')

describe('chunkText()', () => {
  it('should split into sentences', () => {
    const text = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam dictum dictum ligula at accumsan. Proin vel interdum ligula, dictum suscipit odio. Pellentesque vel enim aliquet, convallis sem a, aliquam nibh. Sed pretium a nulla non finibus.'
    const parts = chunkText(text, 65)
    expect(parts).toEqual([
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      'Nullam dictum dictum ligula at accumsan.',
      'Proin vel interdum ligula, dictum suscipit odio.',
      'Pellentesque vel enim aliquet, convallis sem a, aliquam nibh.',
      'Sed pretium a nulla non finibus.'
    ])
  })

  it('should combine short sentences into a single chunk', () => {
    const text = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam dictum dictum ligula at accumsan. Proin vel interdum ligula, dictum suscipit odio. Pellentesque vel enim aliquet, convallis sem a, aliquam nibh. Sed pretium a nulla non finibus. Vestibulum ex diam, feugiat sit amet pellentesque id, vestibulum quis turpis.'
    const parts = chunkText(text, 110)
    expect(parts).toEqual([
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam dictum dictum ligula at accumsan.',
      'Proin vel interdum ligula, dictum suscipit odio. Pellentesque vel enim aliquet, convallis sem a, aliquam nibh.',
      'Sed pretium a nulla non finibus. Vestibulum ex diam, feugiat sit amet pellentesque id, vestibulum quis turpis.'
    ])
  })

  it('should split long sentences into chunks', () => {
    const text = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit nullam dictum dictum ligula at accumsan proin vel interdum ligula, dictum suscipit odio pellentesque vel enim aliquet, convallis sem a, aliquam nibh.'
    const parts = chunkText(text, 50)
    expect(parts).toEqual([
      'Lorem ipsum dolor sit amet, consectetur adipiscing',
      'elit nullam dictum dictum ligula at accumsan proin',
      'vel interdum ligula, dictum suscipit odio',
      'pellentesque vel enim aliquet, convallis sem a,',
      'aliquam nibh.'
    ])
  })

  it('should split words for abnormally small maximums', () => {
    const text = 'hello my world'
    const parts = chunkText(text, 2)
    expect(parts).toEqual(['he', 'll', 'o', 'my', 'wo', 'rl', 'd'])
  })

  it('should split abnormally long words', () => {
    const text = 'My favorite word is supercalifragilisticexpialidocious. It\'s quite atrocious.'
    const parts = chunkText(text, 10)
    expect(parts).toEqual([
      'My', 'favorite', 'word is su', 'percalifra', 'gilisticex', 'pialidocio', 'us.',
      'It\'s quite', 'atrocious.'
    ])
  })

  it('should split the Gettysburg Address into parts', () => {
    const text = `Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal.

    Now we are engaged in a great civil war, testing whether that nation, or any nation so conceived and so dedicated, can long endure. We are met on a great battle-field of that war. We have come to dedicate a portion of that field, as a final resting place for those who here gave their lives that that nation might live. It is altogether fitting and proper that we should do this.

    But, in a larger sense, we can not dedicate -- we can not consecrate -- we can not hallow -- this ground. The brave men, living and dead, who struggled here, have consecrated it, far above our poor power to add or detract. The world will little note, nor long remember what we say here, but it can never forget what they did here. It is for us the living, rather, to be dedicated here to the unfinished work which they who fought here have thus far so nobly advanced. It is rather for us to be here dedicated to the great task remaining before us -- that from these honored dead we take increased devotion to that cause for which they gave the last full measure of devotion -- that we here highly resolve that these dead shall not have died in vain -- that this nation, under God, shall have a new birth of freedom -- and that government of the people, by the people, for the people, shall not perish from the earth.`

    const parts = chunkText(text, 200)
    expect(parts).toEqual([
      'Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal.',
      'Now we are engaged in a great civil war, testing whether that nation, or any nation so conceived and so dedicated, can long endure. We are met on a great battle-field of that war.',
      'We have come to dedicate a portion of that field, as a final resting place for those who here gave their lives that that nation might live. It is altogether fitting and proper that we should do this.',
      'But, in a larger sense, we can not dedicate -- we can not consecrate -- we can not hallow -- this ground.',
      'The brave men, living and dead, who struggled here, have consecrated it, far above our poor power to add or detract.',
      'The world will little note, nor long remember what we say here, but it can never forget what they did here.',
      'It is for us the living, rather, to be dedicated here to the unfinished work which they who fought here have thus far so nobly advanced.',
      'It is rather for us to be here dedicated to the great task remaining before us -- that from these honored dead we take increased devotion to that cause for which they gave the last full measure of',
      'devotion -- that we here highly resolve that these dead shall not have died in vain -- that this nation, under God, shall have a new birth of freedom -- and that government of the people, by the',
      'people, for the people, shall not perish from the earth.'
    ])
  })

  it('should work for long texts', () => {
    const text = new Array(200).fill(0).map(_ => 'This is a sentence.').join(' ')
    expect(() => {
      chunkText(text, 20)
    }).not.toThrow()
  })
})

describe('splitIntoSentences()', () => {
  const example = `
  Apache License
  Version 2.0, January 2004
http://www.apache.org/licenses/

TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

1. Definitions.

"License" shall mean the terms and conditions for use, reproduction,
and distribution as defined by Sections 1 through 9 of this document.

"Licensor" shall mean the copyright owner or entity authorized by
the copyright owner that is granting the License.

"Legal Entity" shall mean the union of the acting entity and all
other entities that control, are controlled by, or are under common
control with that entity. For the purposes of this definition,
"control" means (i) the power, direct or indirect, to cause the
direction or management of such entity, whether by contract or
otherwise, or (ii) ownership of fifty percent (50%) or more of the
outstanding shares, or (iii) beneficial ownership of such entity.
`

  it('should split the text into sentences', () => {
    const parts = splitIntoSentences(example)
    expect(parts).toEqual([
      `Apache License
  Version 2.0, January 2004
http://www.apache.org/licenses/

TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

1. Definitions.`,
      `"License" shall mean the terms and conditions for use, reproduction,
and distribution as defined by Sections 1 through 9 of this document.`,
      `"Licensor" shall mean the copyright owner or entity authorized by
the copyright owner that is granting the License.`,
      `"Legal Entity" shall mean the union of the acting entity and all
other entities that control, are controlled by, or are under common
control with that entity.`,
      `For the purposes of this definition,
"control" means (i) the power, direct or indirect, to cause the
direction or management of such entity, whether by contract or
otherwise, or (ii) ownership of fifty percent (50%) or more of the
outstanding shares, or (iii) beneficial ownership of such entity.`
    ])
  })

  it('should split the text into sentences', () => {
    const text = 'Lorem ipsum, dolor sed amat frequentor minimus. Second sentence.'
    const parts = splitIntoSentences(text)
    expect(parts).toEqual([
      'Lorem ipsum, dolor sed amat frequentor minimus.',
      'Second sentence.'
    ])
  })

  it('should work with difficult sentences (A)', () => {
    const text = 'On Jan. 20, former Sen. Barack Obama became the 44th President of the U.S. Millions attended the Inauguration.'
    const parts = splitIntoSentences(text)
    expect(parts).toEqual([
      'On Jan. 20, former Sen. Barack Obama became the 44th President of the U.S.',
      'Millions attended the Inauguration.'
    ])
  })

  it('should work with difficult sentences (B)', () => {
    const text = 'Sen. Barack Obama became the 44th President of the US. Millions attended.'
    const parts = splitIntoSentences(text)
    expect(parts).toEqual([
      'Sen. Barack Obama became the 44th President of the US.',
      'Millions attended.'
    ])
  })

  it('should work with difficult sentences (C)', () => {
    const text = 'Barack Obama, previously Sen. of lorem ipsum, became the 44th President of the U.S. Millions attended.'
    const parts = splitIntoSentences(text)
    expect(parts).toEqual([
      'Barack Obama, previously Sen. of lorem ipsum, became the 44th President of the U.S.',
      'Millions attended.'
    ])
  })

  /**
   * TODO: Sentence splitting needs better support of acronyms
  it('should work with difficult sentences (D)', () => {
    const text = 'Baril, a Richmond lawyer once nominated for a federal prosecutors job, endorsed a faith-based drug initiative in local jails patterned after the Henrico County jails therapeutic program called Project R.I.S.E. Just as important, he had a great foil across the net.'
    const parts = splitIntoSentences(text)
    expect(parts).toEqual([
      'Baril, a Richmond lawyer once nominated for a federal prosecutors job, endorsed a faith-based drug initiative in local jails patterned after the Henrico County jails therapeutic program called Project R.I.S.E.',
      'Just as important, he had a great foil across the net.'
    ])
  })

  it('should work with difficult sentences (E)', () => {
    const text = 'Newsletter AIDs CARE, EDUCATION AND TRAINING Issue No. 7. Acet Home Care, which moves into the building in July, will share the offices with two other AIDS charities, P.A.L.S. (Portsmouth AIDS Link Support) and the Link Project.'
    const parts = splitIntoSentences(text)
    expect(parts).toEqual([
      'Newsletter AIDs CARE, EDUCATION AND TRAINING Issue No. 7.',
      'Acet Home Care, which moves into the building in July, will share the offices with two other AIDS charities, P.A.L.S. (Portsmouth AIDS Link Support) and the Link Project.'
    ])
  })

  it('should work with difficult sentences (F)', () => {
    const text = 'Another is expanded hours of operation -- from fewer than five hours a day to 9:30 a.m. to 4 p.m. Monday through Saturday. Sunday remains closed.'
    const parts = splitIntoSentences(text)
    expect(parts).toEqual([
      'Another is expanded hours of operation -- from fewer than five hours a day to 9:30 a.m. to 4 p.m. Monday through Saturday.',
      'Sunday remains closed.'
    ])
  })

  it('should work with difficult sentences (G)', () => {
    const text = 'Gold Wing Road Rider\'s Association - Coffee break, Guzzardo\'s Italian Villa, eat, 6 p.m.; ride, 7 p.m. Then at 9 p.m. go home.'
    const parts = splitIntoSentences(text)
    expect(parts).toEqual([
      'Gold Wing Road Rider\'s Association - Coffee break, Guzzardo\'s Italian Villa, eat, 6 p.m.; ride, 7 p.m.',
      'Then at 9 p.m. go home.'
    ])
  })

  it('should work with difficult sentences (H)', () => {
    const text = 'It happened around 5:30 p.m. in the 500 block of W. 82nd St. Investigators say Terrence Taylor, 22, and Deontrell Sloan, 17, got into an argument over money during the game.'
    const parts = splitIntoSentences(text)
    expect(parts).toEqual([
      'It happened around 5:30 p.m. in the 500 block of W. 82nd St. Investigators say Terrence Taylor, 22, and Deontrell Sloan, 17, got into an argument over money during the game.'
    ])
  })
  */

  it('should work with difficult sentences (I)', () => {
    const text = 'GARY Mayor Scott L. King has declared a \'cash crisis\' and has asked city department heads to put off all non-essential spending until June.'
    const parts = splitIntoSentences(text)
    expect(parts).toEqual([
      'GARY Mayor Scott L. King has declared a \'cash crisis\' and has asked city department heads to put off all non-essential spending until June.'
    ])
  })

  it('should work with difficult sentences (J)', () => {
    const text = 'HOWELL, Mich. - Blissfield was only nine outs away from ending the longest winning streak'
    const parts = splitIntoSentences(text)
    expect(parts).toEqual([
      'HOWELL, Mich. - Blissfield was only nine outs away from ending the longest winning streak'
    ])
  })

  it('should work with difficult sentences (K)', () => {
    const text = '33 FORT LAUDERDALE U.S. President George W Bush touted free trade as a means of strengthening democracy'
    const parts = splitIntoSentences(text)
    expect(parts).toEqual([
      '33 FORT LAUDERDALE U.S. President George W Bush touted free trade as a means of strengthening democracy'
    ])
  })

  it('should work with difficult sentences (L)', () => {
    const text = 'Mike Tyler rides his bike on Del. 1 near Lewes early last month'
    const parts = splitIntoSentences(text)
    expect(parts).toEqual([
      'Mike Tyler rides his bike on Del. 1 near Lewes early last month'
    ])
  })

  /**
   * TODO
  it('should not skip a dot in the middle of a word if followed by a capital letter', () => {
    const text = 'Hello Barney.The bird in the word.'
    const parts = splitIntoSentences(text)
    expect(parts).toEqual([
      'Hello Barney.',
      'The bird in the word.'
    ])
  })
  */

  it('should skip punctuation inside of brackets', () => {
    const text = 'Lorem ipsum, dolor sed amat frequentor minimus with a sentence [example?] that should not (Though sometimes...) be two or more (but one!) sentences.'
    const parts = splitIntoSentences(text)
    expect(parts).toEqual([
      'Lorem ipsum, dolor sed amat frequentor minimus with a sentence [example?] that should not (Though sometimes...) be two or more (but one!) sentences.'
    ])
  })

  it('should skip numbers', () => {
    const text = '10 times 10 = 10.00^2. 13.000 14.50 and 14,000,000.50'
    const parts = splitIntoSentences(text)
    expect(parts).toEqual([
      '10 times 10 = 10.00^2.',
      '13.000 14.50 and 14,000,000.50'
    ])
  })

  it('should skip URLs and emails', () => {
    const text = 'Search on http://google.com. Then send me an email: fabien@example.com or fabien@example.org'
    const parts = splitIntoSentences(text)
    expect(parts).toEqual([
      'Search on http://google.com.',
      'Then send me an email: fabien@example.com or fabien@example.org'
    ])
  })

  it('should skip phone numbers', () => {
    const text = 'Call +44.3847838 for whatever.'
    const parts = splitIntoSentences(text)
    expect(parts).toEqual([
      'Call +44.3847838 for whatever.'
    ])
  })

  it('should skip money with currency indication', () => {
    const text = 'I paid €12.50 for that CD. Twelve dollars and fifty cent ($12.50). Ten pounds - £10.00 it is fine.'
    const parts = splitIntoSentences(text)
    expect(parts).toEqual([
      'I paid €12.50 for that CD.',
      'Twelve dollars and fifty cent ($12.50).',
      'Ten pounds - £10.00 it is fine.'
    ])
  })

  it('should not end sentences at newlines/paragraphs', () => {
    const text = 'The humble bundle sale\r\nDate: Monday-Fri starting 2015-01-01'
    const parts = splitIntoSentences(text)
    expect(parts).toEqual([
      'The humble bundle sale\r\nDate: Monday-Fri starting 2015-01-01'
    ])
  })

  it('should work with question marks and exclamation marks', () => {
    const text = 'Hello this is my first sentence? There is also a second! A third'
    const parts = splitIntoSentences(text)
    expect(parts).toEqual([
      'Hello this is my first sentence?',
      'There is also a second!',
      'A third'
    ])
  })

  it('should skip keywords/code with a dot in it', () => {
    const text = 'HELLO A.TOP IS NICE'
    const parts = splitIntoSentences(text)
    expect(parts).toEqual([
      'HELLO A.TOP IS NICE'
    ])
  })

  it('should preserve newlines in sentences with lists', () => {
    const text = 'First sentence... Another list: \n - green \n - blue \n - red'
    const parts = splitIntoSentences(text)
    expect(parts).toEqual([
      'First sentence...',
      'Another list: \n - green \n - blue \n - red'
    ])
  })

  it('should ignore multilines', () => {
    const text = `How now brown cow.

    Peter Piper Picked a peck of pickled peppers. A peck of pickled peppers peter piper picked.`
    const parts = splitIntoSentences(text)
    expect(parts).toEqual([
      'How now brown cow.',
      'Peter Piper Picked a peck of pickled peppers.',
      'A peck of pickled peppers peter piper picked.'
    ])
  })

  it('should ignore newlines in sentences without lists', () => {
    const text = 'First sentence... Another sentence.\nThis is a new paragraph.'
    const parts = splitIntoSentences(text)
    expect(parts).toEqual([
      'First sentence...',
      'Another sentence.',
      'This is a new paragraph.'
    ])
  })

  it('should not get a sentence from an empty string', () => {
    const text = ''
    const parts = splitIntoSentences(text)
    expect(parts).toEqual([])
  })

  it('should not get a sentence from a string of whitespace', () => {
    const text = '            \n\n                 '
    const parts = splitIntoSentences(text)
    expect(parts).toEqual([])
  })

  it('should not get a sentence from undefined', () => {
    const parts = splitIntoSentences()
    expect(parts).toEqual([])
  })

  it('should not get a sentence from an array', () => {
    const parts = splitIntoSentences([])
    expect(parts).toEqual([])
  })

  it('should not get a sentence from an object', () => {
    const parts = splitIntoSentences({})
    expect(parts).toEqual([])
  })

  /**
   * TODO: Sentence splitting needs better support of acronyms
  it('should skip dotted abbreviations (A)', () => {
    const text = 'Lorem ipsum, dolor sed amat frequentor minimus In I.C.T we have multiple challenges! There should only be two sentences.'
    const parts = splitIntoSentences(text)
    expect(parts).toEqual([
      'Lorem ipsum, dolor sed amat frequentor minimus In I.C.T we have multiple challenges!',
      'There should only be two sentences.'
    ])
  })

  it('should skip dotted abbreviations (B)', () => {
    const text = 'From amat frequentor minimus hello there at 8 a.m. there p.m. should only be two sentences.'
    const parts = splitIntoSentences(text)
    expect(parts).toEqual([
      'From amat frequentor minimus hello there at 8 a.m. there p.m. should only be two sentences.'
    ])
  })

  it('should skip dotted abbreviations (C)', () => {
    const text = 'The school, called Booker T and Stevie Ray\'s Wrestling and Mixed Mart Arts Academy, will have an open house 2-6 p.m. Saturday.'
    const parts = splitIntoSentences(text)
    expect(parts).toEqual([
      'The school, called Booker T and Stevie Ray\'s Wrestling and Mixed Mart Arts Academy, will have an open house 2-6 p.m. Saturday.'
    ])
  })

  it('should skip common abbreviations', () => {
    const text = 'Fig. 2. displays currency rates i.e. something libsum. Currencies widely available (i.e. euro, dollar, pound), or alternatively (e.g. €, $, etc.)'
    const parts = splitIntoSentences(text)
    expect(parts).toEqual([
      'Fig. 2. displays currency rates i.e. something libsum.',
      'Currencies widely available (i.e. euro, dollar, pound), or alternatively (e.g. €, $, etc.)'
    ])
  })
  */

  it('should skip two-word abbreviations (A)', () => {
    const text = 'Claims 1–6 and 15–26 are rejected under pre-AIA 35 USC § 103(a) as being unpatentable over Chalana et al. (US 2012/0179503) in view of Oh (US 2013/0013993).'
    const parts = splitIntoSentences(text)
    expect(parts).toEqual([
      'Claims 1–6 and 15–26 are rejected under pre-AIA 35 USC § 103(a) as being unpatentable over Chalana et al. (US 2012/0179503) in view of Oh (US 2013/0013993).'
    ])
  })

  it('should skip two-word abbreviations (B)', () => {
    const text = 'Et al. is an abbreviation of the Latin loanphrase et alii, meaning and others. It is similar to etc. (short for et cetera, meaning and the rest), but whereas etc. applies to things, et al. applies to people.'
    const parts = splitIntoSentences(text)
    expect(parts).toEqual([
      'Et al. is an abbreviation of the Latin loanphrase et alii, meaning and others.',
      'It is similar to etc. (short for et cetera, meaning and the rest), but whereas etc. applies to things, et al. applies to people.'
    ])
  })

  it('should include ellipsis as ending if a capital letter follows', () => {
    const text = 'First sentence... Another sentence'
    const parts = splitIntoSentences(text)
    expect(parts).toEqual([
      'First sentence...',
      'Another sentence'
    ])
  })
})
