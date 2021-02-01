export function levelXP(level_n: number) {
    return Math.round(Math.log10(level_n ** level_n) * 1000);
}

export function getLevel(xp: number) {
    var i = 1;

    while (true) {
        if (xp / levelXP(i) < 1) {
            return i - 1;
        } else i++;
    }
}