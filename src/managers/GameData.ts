
export interface StoryCard {
    id: string;
    title: string;
    description: string;
    isUnlocked: boolean;
}

export interface Achievement {
    id: string;
    title: string;
    description: string;
    target: number;
    current: number;
    isClaimed: boolean;
    rewardCardId: string;
}

export class GameData {
    private static instance: GameData;

    public currentStage: number = 1;
    public unlockedCardCount: number = 0;

    // Stats
    public playerMaxHP: number = 100;
    public weaponLevel: number = 1;

    public storyCards: StoryCard[] = [];
    public achievements: Achievement[] = [];

    private constructor() {
        this.initializeData();
    }

    public static getInstance(): GameData {
        if (!GameData.instance) {
            GameData.instance = new GameData();
        }
        return GameData.instance;
    }

    private initializeData() {
        // Mock Story Cards
        for (let i = 1; i <= 20; i++) {
            this.storyCards.push({
                id: `card_${i}`,
                title: `Story Chapter ${i}`,
                description: `This is the detail text for chapter ${i}. The cat climbed higher...`,
                isUnlocked: i === 1 // First one unlocked
            });
        }
        this.updateUnlockedCount();

        // Mock Achievements
        this.achievements = [
            { id: 'ach_1', title: 'First Step', description: 'Clear Stage 1', target: 1, current: 0, isClaimed: false, rewardCardId: 'card_2' },
            { id: 'ach_2', title: 'Collector', description: 'Collect 10 Items', target: 10, current: 0, isClaimed: false, rewardCardId: 'card_3' },
            { id: 'ach_3', title: 'High Jumper', description: 'Reach 5000 Height', target: 5000, current: 0, isClaimed: false, rewardCardId: 'card_4' }
        ];
    }

    public updateUnlockedCount() {
        this.unlockedCardCount = this.storyCards.filter(c => c.isUnlocked).length;
    }

    public unlockCard(id: string) {
        const card = this.storyCards.find(c => c.id === id);
        if (card && !card.isUnlocked) {
            card.isUnlocked = true;
            this.updateUnlockedCount();
        }
    }

    public completeStage() {
        this.currentStage++;
        // Simple scaling
        this.playerMaxHP += 10;
        this.weaponLevel++;

        // Unlock a generic card for clearing stage?
        // For simplicity, let's unlock next card index
        const cardToUnlock = this.storyCards[this.currentStage - 1]; // e.g. Stage 2 -> index 1 -> card_2
        if (cardToUnlock) {
            this.unlockCard(cardToUnlock.id);
        }

        // Update achievements (Mock logic)
        const ach = this.achievements.find(a => a.id === 'ach_1');
        if (ach) ach.current = this.currentStage;
    }

    public incrementAchievement(id: string, amount: number) {
        const ach = this.achievements.find(a => a.id === id);
        if (ach && !ach.isClaimed) {
            ach.current += amount;
        }
    }

    public claimAchievement(id: string) {
        const ach = this.achievements.find(a => a.id === id);
        if (ach && ach.current >= ach.target && !ach.isClaimed) {
            ach.isClaimed = true;
            this.unlockCard(ach.rewardCardId);
        }
    }
}
