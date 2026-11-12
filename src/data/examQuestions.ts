/**
 * Exam Hall question bank (UNILAG mini game, game/exam.ts). Nigerian general knowledge plus course basics.
 * `a` is the index of the right option in the order written here; the game shuffles the options per sitting.
 */
export interface ExamQuestion { q: string; options: [string, string, string, string]; a: number; topic: 'Nigeria' | 'Science' | 'Computing' | 'Maths' | 'Business' | 'English' }

export const EXAM_QUESTIONS: ExamQuestion[] = [
  { q: 'What is the capital of Nigeria?', options: ['Abuja', 'Lagos', 'Kano', 'Port Harcourt'], a: 0, topic: 'Nigeria' },
  { q: 'In which year did Nigeria become independent?', options: ['1960', '1963', '1957', '1970'], a: 0, topic: 'Nigeria' },
  { q: 'How many states does Nigeria have?', options: ['36', '30', '32', '40'], a: 0, topic: 'Nigeria' },
  { q: 'Which river is the longest in Nigeria?', options: ['River Niger', 'River Benue', 'River Ogun', 'River Kaduna'], a: 0, topic: 'Nigeria' },
  { q: 'Who was Nigeria\'s first Prime Minister?', options: ['Abubakar Tafawa Balewa', 'Nnamdi Azikiwe', 'Obafemi Awolowo', 'Ahmadu Bello'], a: 0, topic: 'Nigeria' },
  { q: 'Which Nigerian won the Nobel Prize in Literature in 1986?', options: ['Wole Soyinka', 'Chinua Achebe', 'Ben Okri', 'Chimamanda Adichie'], a: 0, topic: 'Nigeria' },
  { q: 'Who wrote "Things Fall Apart"?', options: ['Chinua Achebe', 'Wole Soyinka', 'Buchi Emecheta', 'Cyprian Ekwensi'], a: 0, topic: 'Nigeria' },
  { q: 'What is the highest mountain in Nigeria?', options: ['Chappal Waddi', 'Mount Cameroon', 'Zuma Rock', 'Olumo Rock'], a: 0, topic: 'Nigeria' },
  { q: 'Which city is called the "Centre of Excellence"?', options: ['Lagos', 'Ibadan', 'Enugu', 'Kaduna'], a: 0, topic: 'Nigeria' },
  { q: 'In what year did the capital move from Lagos to Abuja?', options: ['1991', '1976', '1999', '1985'], a: 0, topic: 'Nigeria' },
  { q: 'What does NYSC stand for?', options: ['National Youth Service Corps', 'Nigerian Youth Support Council', 'National Youth Skills Centre', 'Nigerian Yearly Service Corps'], a: 0, topic: 'Nigeria' },
  { q: 'Which ocean borders the south of Nigeria?', options: ['Atlantic Ocean', 'Indian Ocean', 'Pacific Ocean', 'Arctic Ocean'], a: 0, topic: 'Nigeria' },
  { q: 'Where does photosynthesis happen in a plant cell?', options: ['Chloroplast', 'Nucleus', 'Mitochondrion', 'Ribosome'], a: 0, topic: 'Science' },
  { q: 'What is the chemical symbol for sodium?', options: ['Na', 'So', 'S', 'Sd'], a: 0, topic: 'Science' },
  { q: 'At sea level, water boils at what temperature?', options: ['100 degrees Celsius', '90 degrees Celsius', '110 degrees Celsius', '212 degrees Celsius'], a: 0, topic: 'Science' },
  { q: 'Which organ pumps blood round the body?', options: ['The heart', 'The liver', 'The lungs', 'The kidney'], a: 0, topic: 'Science' },
  { q: 'What does HTML stand for?', options: ['HyperText Markup Language', 'HighText Machine Language', 'HyperTool Multi Language', 'Home Text Markup Language'], a: 0, topic: 'Computing' },
  { q: 'Which keyword defines a function in Python?', options: ['def', 'func', 'function', 'fn'], a: 0, topic: 'Computing' },
  { q: 'What is 5 written in binary?', options: ['101', '110', '011', '111'], a: 0, topic: 'Computing' },
  { q: 'What does CPU stand for?', options: ['Central Processing Unit', 'Computer Power Unit', 'Central Program Utility', 'Core Processing Update'], a: 0, topic: 'Computing' },
  { q: 'What is 12 multiplied by 12?', options: ['144', '124', '132', '156'], a: 0, topic: 'Maths' },
  { q: 'What is the square root of 81?', options: ['9', '8', '7', '11'], a: 0, topic: 'Maths' },
  { q: 'What is 15% of 200?', options: ['30', '15', '20', '25'], a: 0, topic: 'Maths' },
  { q: 'In accounting, Assets equal what?', options: ['Liabilities plus Equity', 'Liabilities minus Equity', 'Income plus Expenses', 'Equity minus Income'], a: 0, topic: 'Business' },
  { q: 'In economics, inflation means what?', options: ['A general rise in prices', 'A fall in unemployment', 'A rise in exports only', 'A fall in taxes'], a: 0, topic: 'Business' },
  { q: 'What does CBN stand for?', options: ['Central Bank of Nigeria', 'Commercial Bank of Nigeria', 'Capital Bureau of Nigeria', 'Central Business Network'], a: 0, topic: 'Business' },
  { q: 'What does GPA stand for?', options: ['Grade Point Average', 'General Pass Award', 'Grade Pass Aggregate', 'Graduate Point Allowance'], a: 0, topic: 'English' },
  { q: 'Which word is a synonym of "rapid"?', options: ['Fast', 'Slow', 'Heavy', 'Quiet'], a: 0, topic: 'English' },
  { q: 'Pick the correct sentence.', options: ['She has finished her assignment.', 'She have finish her assignment.', 'She finished her assignment already has.', 'She has finish her assignment.'], a: 0, topic: 'English' },
  { q: 'In what year was the University of Lagos founded?', options: ['1962', '1948', '1970', '1955'], a: 0, topic: 'Nigeria' },
];
