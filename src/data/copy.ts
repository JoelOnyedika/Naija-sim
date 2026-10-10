/** Nigerian-flavoured UI copy. Standard English by default; Pidgin where it adds flavour. */
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

export const copy = {
  alert: (amount: string) => pick([`Omo, your balance don enter alert. +${amount}`, `Your account don receive money: +${amount}`, `Credit alert: +${amount}. No wahala.`]),
  buy: () => pick(['Sharp sharp. Item don land.', 'No wahala. Purchase successful.', 'Nice one. Enjoy your new item.']),
  broke: () => pick(['Omo, your money no reach.', 'Balance low. Hustle harder.', 'You wan buy this? Your account says no.']),
  hungry: () => pick(['Your stomach dey sing. Find food.', 'Hunger dey worry you. Eat something.']),
  tired: () => pick(['You dey yawn. Find bed.', 'Energy low. Rest small.']),
  workDone: (pay: string) => pick([`Shift done. ${pay} don enter.`, `Hustle paid: ${pay}.`]),
  foodArrived: () => pick(['Your food don land.', 'Rider is downstairs. Come and collect.']),
  welcome: ['Welcome to Naija. Eat well, sleep well, hustle harder.', 'Naija no dey carry last. Gather yourself.'],
};
export const pickCopy = pick;
