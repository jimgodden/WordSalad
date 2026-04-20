const CONVERSATIONAL_BASICS = [
    'a', 'an', 'the', 'this', 'that', 'these', 'those', 'my', 'your', 'our',
    'their', 'his', 'her', 'its', 'some', 'any', 'every', 'each', 'one', 'two',
    'three', 'many', 'few', 'more', 'less', 'very', 'really', 'just', 'still', 'almost',
    'always', 'never', 'maybe', 'probably', 'definitely', 'suddenly', 'actually', 'literally', 'basically', 'honestly',
    'and', 'but', 'or', 'so', 'because', 'if', 'then', 'while', 'although', 'however',
    'also', 'instead', 'besides', 'before', 'after', 'during', 'until', 'since', 'with', 'without',
    'for', 'from', 'into', 'onto', 'over', 'under', 'through', 'around', 'behind', 'beside',
    'inside', 'outside', 'near', 'far', 'up', 'down', 'off', 'on', 'in', 'out'
];

const COMMON_VERBS = [
    'am', 'is', 'are', 'was', 'were', 'be', 'being', 'been', 'have', 'has',
    'had', 'do', 'does', 'did', 'can', 'could', 'will', 'would', 'should', 'might',
    'must', 'make', 'made', 'get', 'got', 'give', 'gave', 'take', 'took', 'put',
    'keep', 'kept', 'find', 'found', 'lose', 'lost', 'tell', 'told', 'say', 'said',
    'ask', 'asked', 'call', 'called', 'bring', 'brought', 'leave', 'left', 'need', 'needed',
    'want', 'wanted', 'love', 'hate', 'like', 'liked', 'know', 'knew', 'think', 'thought',
    'look', 'looked', 'watch', 'watched', 'hear', 'heard', 'feel', 'felt', 'smell', 'taste',
    'eat', 'ate', 'drink', 'drank', 'cook', 'cooked', 'bake', 'baked', 'fry', 'fried',
    'boil', 'grill', 'mix', 'stir', 'flip', 'drop', 'spill', 'grab', 'carry', 'open',
    'close', 'push', 'pull', 'throw', 'catch', 'run', 'walk', 'dance', 'sing', 'laugh',
    'cry', 'scream', 'whisper', 'yell', 'argue', 'apologize', 'panic', 'celebrate', 'cheer', 'wave',
    'trip', 'slip', 'crash', 'float', 'zoom', 'sneak', 'hide', 'blink', 'stare', 'pose'
];

const HELPFUL_ADJECTIVES = [
    'funny', 'weird', 'awkward', 'dramatic', 'tiny', 'giant', 'mini', 'huge', 'loud', 'quiet',
    'shiny', 'sparkly', 'dusty', 'messy', 'clean', 'crispy', 'chewy', 'crunchy', 'soggy', 'spicy',
    'sweet', 'salty', 'bitter', 'fancy', 'cheap', 'legendary', 'average', 'sad', 'happy', 'angry',
    'sleepy', 'hungry', 'confused', 'suspicious', 'heroic', 'cowardly', 'polite', 'rude', 'chaotic', 'calm',
    'goofy', 'serious', 'wild', 'mysterious', 'backwards', 'upside-down', 'broken', 'fresh', 'stale', 'greasy',
    'cold', 'hot', 'warm', 'frozen', 'toasted', 'burnt', 'glorious', 'tragic', 'unexpected', 'embarrassing',
    'curious', 'nosy', 'smug', 'nervous', 'brave', 'clumsy', 'perfect', 'terrible', 'magical', 'haunted',
    'fake', 'real', 'invisible', 'secret', 'public', 'portable', 'professional', 'questionable', 'speedy', 'slow'
];

const REACTION_WORDS = [
    'hello', 'hi', 'hey', 'please', 'thanks', 'sorry', 'wow', 'oops', 'yikes', 'uh-oh',
    'nope', 'yep', 'okay', 'fine', 'great', 'amazing', 'terrible', 'help', 'listen', 'wait',
    'stop', 'go', 'yes', 'no', 'maybe', 'who', 'what', 'when', 'where', 'why',
    'how', 'because', 'anyway', 'meanwhile', 'apparently', 'somehow', 'clearly', 'obviously', 'frankly', 'today',
    'tonight', 'tomorrow', 'yesterday', 'soon', 'later', 'first', 'second', 'last', 'next', 'again'
];

const PEOPLE_AND_ROLES = [
    'chef', 'judge', 'grandma', 'uncle', 'neighbor', 'coworker', 'roommate', 'barista', 'teacher', 'principal',
    'wizard', 'pirate', 'astronaut', 'dentist', 'librarian', 'coach', 'detective', 'intern', 'boss', 'clown',
    'villain', 'hero', 'cashier', 'driver', 'tourist', 'influencer', 'comedian', 'magician', 'cowboy', 'alien',
    'robot', 'cat', 'dog', 'hamster', 'pigeon', 'raccoon', 'goose', 'llama', 'dolphin', 'shark',
    'penguin', 'dragon', 'ghost', 'goblin', 'toddler', 'teenager', 'parent', 'sibling', 'bestie', 'stranger'
];

const PLACES_AND_SITUATIONS = [
    'kitchen', 'office', 'basement', 'garage', 'classroom', 'cafeteria', 'driveway', 'elevator', 'bathroom', 'rooftop',
    'subway', 'parking lot', 'farm', 'moon', 'museum', 'circus', 'mall', 'airport', 'wedding', 'funeral',
    'birthday', 'picnic', 'rehearsal', 'karaoke', 'traffic', 'meeting', 'group chat', 'vacation', 'reunion', 'podcast'
];

const EVERYDAY_NOUNS = [
    'phone', 'charger', 'remote', 'blanket', 'lamp', 'sofa', 'pillow', 'sock', 'spoon', 'fork',
    'knife', 'plate', 'cup', 'mug', 'bowl', 'napkin', 'menu', 'receipt', 'coupon', 'calendar',
    'keyboard', 'mouse', 'screen', 'microphone', 'camera', 'door', 'window', 'bucket', 'ladder', 'helmet',
    'backpack', 'notebook', 'marker', 'trophy', 'candle', 'balloon', 'guitar', 'trumpet', 'drum', 'kazoo',
    'toaster', 'microwave', 'blender', 'fridge', 'freezer', 'thermos', 'vacuum', 'umbrella', 'scooter', 'ticket'
];

const FOOD_AND_KITCHEN_WORDS = [
    'pasta', 'pizza', 'burger', 'sandwich', 'taco', 'burrito', 'salad', 'soup', 'waffle', 'pancake',
    'omelet', 'casserole', 'dumpling', 'meatball', 'noodle', 'cookie', 'brownie', 'cupcake', 'donut', 'muffin',
    'pickle', 'mustard', 'ketchup', 'mayonnaise', 'gravy', 'syrup', 'jelly', 'butter', 'cheese', 'yogurt',
    'milk', 'coffee', 'tea', 'soda', 'juice', 'lemonade', 'smoothie', 'ice cream', 'popcorn', 'pretzel',
    'toast', 'bagel', 'croissant', 'rice', 'bean', 'onion', 'garlic', 'tomato', 'potato', 'pepper',
    'lettuce', 'broccoli', 'carrot', 'mushroom', 'olive', 'banana', 'apple', 'grape', 'watermelon', 'strawberry',
    'chicken', 'beef', 'bacon', 'shrimp', 'salmon', 'egg', 'wafer', 'cracker', 'nacho', 'pudding'
];

const FUNNY_NOUNS = [
    'disaster', 'masterpiece', 'scheme', 'plan', 'rumor', 'excuse', 'speech', 'announcement', 'receipt', 'review',
    'curse', 'blessing', 'vibe', 'mood', 'plot twist', 'secret', 'mistake', 'legend', 'scandal', 'mystery',
    'meme', 'side quest', 'chaos', 'drama', 'buffet', 'reward', 'penalty', 'meltdown', 'breakdown', 'comeback',
    'miracle', 'nightmare', 'deal', 'bargain', 'fashion show', 'joke', 'punchline', 'caption', 'nickname', 'warning'
];

const USEFUL_PRONOUNS = [
    'I', 'you', 'we', 'they', 'he', 'she', 'it', 'someone', 'nobody', 'everybody',
    'friend', 'enemy', 'captain', 'manager', 'grandpa', 'cousin', 'babysitter', 'landlord', 'roommate', 'celebrity'
];

const PLAYFUL_WORDS = [
    'vibes', 'legend', 'chaos', 'awkward', 'cringe', 'iconic', 'retro', 'dramatic', 'sneaky', 'goober',
    'bonkers', 'bizarre', 'wobbly', 'zoomy', 'fancy', 'sus', 'rizz', 'goblin', 'gremlin', 'banana-peel',
    'dingus', 'goofball', 'snacc', 'brunch', 'giggle', 'boop', 'yeet', 'yoink', 'bonk', 'skedaddle'
];

const WORD_GROUPS = [
    { words: CONVERSATIONAL_BASICS, weight: 0.2 },
    { words: COMMON_VERBS, weight: 0.2 },
    { words: HELPFUL_ADJECTIVES, weight: 0.14 },
    { words: REACTION_WORDS, weight: 0.1 },
    { words: PEOPLE_AND_ROLES, weight: 0.08 },
    { words: PLACES_AND_SITUATIONS, weight: 0.05 },
    { words: EVERYDAY_NOUNS, weight: 0.08 },
    { words: FOOD_AND_KITCHEN_WORDS, weight: 0.08 },
    { words: FUNNY_NOUNS, weight: 0.04 },
    { words: USEFUL_PRONOUNS, weight: 0.01 },
    { words: PLAYFUL_WORDS, weight: 0.02 }
];

export const WORDS = WORD_GROUPS.flatMap(({ words }) => words);

const shuffle = <T,>(items: T[]) => {
    const copy = [...items];

    for (let index = copy.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }

    return copy;
};

export const drawWordHand = (count: number) => {
    const chosenWords = new Set<string>();
    const hand: string[] = [];

    WORD_GROUPS.forEach(({ words, weight }) => {
        const targetCount = Math.min(words.length, Math.floor(count * weight));
        shuffle(words)
            .filter((word) => !chosenWords.has(word))
            .slice(0, targetCount)
            .forEach((word) => {
                chosenWords.add(word);
                hand.push(word);
            });
    });

    if (hand.length < count) {
        shuffle(WORDS)
            .filter((word) => !chosenWords.has(word))
            .slice(0, count - hand.length)
            .forEach((word) => {
                chosenWords.add(word);
                hand.push(word);
            });
    }

    return shuffle(hand).slice(0, count);
};
