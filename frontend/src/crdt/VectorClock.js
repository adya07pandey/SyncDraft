export default class VectorClock {

    constructor(userId) {
        this.userId = userId;
        this.clock = new Map();

        this.clock.set(userId, 0);
    }

    increment() {
        const current = this.clock.get(this.userId) || 0;
        this.clock.set(this.userId, current + 1);
    }

    get() {
        return Object.fromEntries(this.clock);
    }

    merge(remoteClock) {

        if (!remoteClock) {
            return;
        }

        for (const [userId, value] of Object.entries(remoteClock)) {
            const current = this.clock.get(userId) || 0;

            this.clock.set(
                userId,
                Math.max(current, value)
            );
        }
    }

    static compare(a, b) {

        let aGreater = false;
        let bGreater = false;

        const users = new Set([
            ...Object.keys(a),
            ...Object.keys(b)
        ]);

        for (const userId of users) {

            const aValue = a[userId] || 0;
            const bValue = b[userId] || 0;

            if (aValue > bValue) {
                aGreater = true;
            }

            if (aValue < bValue) {
                bGreater = true;
            }
        }

        if (aGreater && !bGreater) {
            return "A_AFTER_B";
        }

        if (bGreater && !aGreater) {
            return "B_AFTER_A";
        }

        if (aGreater && bGreater) {
            return "CONCURRENT";
        }

        return "EQUAL";
    }
}