/**
 * Lightweight English-to-Tamil Phonetic Transliteration Utility
 * Specifically optimized for names and places.
 */

const vowels = {
    'a': 'அ', 'aa': 'ஆ', 'A': 'ஆ', 'i': 'இ', 'ii': 'ஈ', 'I': 'ஈ',
    'u': 'உ', 'uu': 'ஊ', 'U': 'ஊ', 'e': 'எ', 'ee': 'ஏ', 'E': 'ஏ',
    'ai': 'ஐ', 'o': 'ஒ', 'oo': 'ஓ', 'O': 'ஓ', 'au': 'ஔ'
};

const consonants = {
    'k': 'க்', 'kh': 'க்', 'g': 'க்', 'gh': 'க்',
    'ng': 'ங்',
    'ch': 'ச்', 'chh': 'ச்', 'j': 'ச்', 'jh': 'ச்',
    'nj': 'ஞ்',
    't': 'ட்', 'th': 'த்', 'd': 'ட்', 'dh': 'த்',
    'n': 'ன்', 'N': 'ண்', 'nh': 'ந்',
    'th': 'த்',
    'p': 'ப்', 'ph': 'ப்', 'b': 'ப்', 'bh': 'ப்',
    'm': 'ம்',
    'y': 'ய்',
    'r': 'ர்', 'R': 'ற்',
    'l': 'ல்', 'L': 'ள்', 'zh': 'ழ்',
    'v': 'வ்', 'w': 'வ்',
    'sh': 'ஷ்', 's': 'ஸ்', 'h': 'ஹ'
};

const matras = {
    'a': '', 'aa': 'ா', 'A': 'ா', 'i': 'ி', 'ii': 'ீ', 'I': 'ீ',
    'u': 'ு', 'uu': 'ூ', 'U': 'ூ', 'e': 'ெ', 'ee': 'ே', 'E': 'ே',
    'ai': 'ை', 'o': 'ொ', 'oo': 'ோ', 'O': 'ோ', 'au': 'ௌ'
};

// Exceptional cases for names
const exceptions = {
    'mani': 'மணி',
    'place': 'இடம்',
    'name': 'பெயர்',
    'cash': 'பணம்',
    'upi': 'யுபிஐ'
};

/**
 * Transliterates English text to Tamil phonetically
 * Optimized for Tamil names and places.
 */
export const toTamil = (text) => {
    if (!text) return '';
    
    // Check for exact word exceptions (case insensitive)
    const lowerText = text.toLowerCase().trim();
    if (exceptions[lowerText]) return exceptions[lowerText];

    let result = '';
    let i = 0;
    const str = text.toLowerCase();

    while (i < str.length) {
        let found = false;

        // Try 2-char combinations first
        if (i + 1 < str.length) {
            const duo = str.substr(i, 2);
            if (vowels[duo]) {
                result += vowels[duo];
                i += 2;
                continue;
            }
            if (consonants[duo]) {
                // Peek next for vowel
                const nextChar = (i + 2 < str.length) ? str[i+2] : '';
                const base = consonants[duo][0]; // Extract base character without pulli
                
                // Special handling for Tamil 'th' and 'nh'
                let tamilBase = consonants[duo].replace('்', '');
                
                if (nextChar && (vowels[nextChar] || vowels[str.substr(i+2, 2)])) {
                    let matraCode = '';
                    let skip = 1;
                    if (vowels[str.substr(i+2, 2)]) {
                        matraCode = matras[str.substr(i+2, 2)];
                        skip = 2;
                    } else {
                        matraCode = matras[nextChar];
                        skip = 1;
                    }
                    result += tamilBase + matraCode;
                    i += 2 + skip;
                } else {
                    result += consonants[duo];
                    i += 2;
                }
                found = true;
                continue;
            }
        }

        // Try single char
        const char = str[i];
        if (vowels[char]) {
            result += (i === 0 || result.slice(-1) === ' ') ? vowels[char] : matras[char];
            i++;
            continue;
        }

        if (consonants[char]) {
            let tamilBase = consonants[char].replace('்', '');
            const nextPart = str.substr(i + 1, 2);
            const nextChar = str[i + 1];

            if (nextPart && vowels[nextPart]) {
                result += tamilBase + matras[nextPart];
                i += 3;
            } else if (nextChar && vowels[nextChar]) {
                result += tamilBase + matras[nextChar];
                i += 2;
            } else {
                result += consonants[char];
                i++;
            }
            continue;
        }

        // Fallback for non-mapped characters (like space, numbers)
        result += char;
        i++;
    }

    return result;
};
