// js/matching-algorithm.js
export class SmartMatchingAlgorithm {
    constructor() {
        this.weights = {
            subjectOverlap: 0.30,      // 30% - Shared subjects
            academicLevel: 0.20,       // 20% - Similar level
            geographic: 0.20,          // 20% - Distance
            schedule: 0.15,            // 15% - Time overlap
            studyStyle: 0.10,          // 10% - Learning preferences
            goals: 0.05                // 5% - Goal alignment
        };
    }

    async findPartners(currentUserProfile, allUsers) {
        const matches = [];
        
        for (const user of allUsers) {
            if (user.uid === currentUserProfile.uid) continue;
            
            const score = this.calculateCompatibility(currentUserProfile, user);
            if (score.total >= 60) { // Minimum 60% match
                matches.push({
                    ...user,
                    compatibilityScore: score.total,
                    matchReasons: score.reasons,
                    details: score.details
                });
            }
        }
        
        // Sort by compatibility score
        return matches.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
    }

    calculateCompatibility(user1, user2) {
        let totalScore = 0;
        const reasons = [];
        const details = {};

        // 1. Subject Overlap (30%)
        const user1Subjects = user1.subjects || [];
        const user2Subjects = user2.subjects || [];
        const subjectOverlap = user1Subjects.filter(s => user2Subjects.includes(s));
        const subjectScore = (subjectOverlap.length / Math.max(user1Subjects.length, 1)) * 100;
        details.subjects = {
            score: Math.round(subjectScore * this.weights.subjectOverlap),
            overlap: subjectOverlap,
            percentage: Math.round(subjectScore)
        };
        totalScore += details.subjects.score;
        if (subjectOverlap.length > 0) {
            reasons.push(`${subjectOverlap.length} shared subjects`);
        }

        // 2. Academic Level (20%)
        const levelScore = user1.academicLevel === user2.academicLevel ? 100 : 0;
        details.level = {
            score: Math.round(levelScore * this.weights.academicLevel),
            match: user1.academicLevel === user2.academicLevel
        };
        totalScore += details.level.score;
        if (details.level.match) reasons.push("Same academic level");

        // 3. Geographic Distance (20%)
        const distance = this.calculateDistance(user1.location, user2.location);
        const distanceScore = Math.max(0, (25 - distance) / 25 * 100);
        details.distance = {
            score: Math.round(distanceScore * this.weights.geographic),
            distance: Math.round(distance),
            unit: 'km'
        };
        totalScore += details.distance.score;
        if (distance <= 10) reasons.push("Nearby location");

        // 4. Schedule Overlap (15%)
        const scheduleOverlap = this.calculateScheduleOverlap(
            user1.availability || {},
            user2.availability || {}
        );
        details.schedule = {
            score: Math.round(scheduleOverlap * this.weights.schedule),
            overlap: Math.round(scheduleOverlap)
        };
        totalScore += details.schedule.score;
        if (scheduleOverlap > 50) reasons.push("Compatible schedules");

        // 5. Study Style (10%)
        const style1 = user1.studyPreferences?.studyStyle || [];
        const style2 = user2.studyPreferences?.studyStyle || [];
        const styleOverlap = style1.filter(s => style2.includes(s));
        const styleScore = (styleOverlap.length / Math.max(style1.length, 1)) * 100;
        details.style = {
            score: Math.round(styleScore * this.weights.studyStyle),
            overlap: styleOverlap
        };
        totalScore += details.style.score;
        if (styleOverlap.length > 0) reasons.push("Similar learning styles");

        return {
            total: Math.round(totalScore),
            reasons: reasons.slice(0, 3), // Top 3 reasons
            details
        };
    }

    calculateDistance(loc1, loc2) {
        // Ghana distance calculation (Accra as center)
        const ghanaCities = {
            'Greater Accra': { lat: 5.6037, lon: -0.1870 },
            'Ashanti': { lat: 6.6667, lon: -1.6167 },
            'Western': { lat: 5.5000, lon: -2.0000 },
            'Central': { lat: 5.1000, lon: -1.2000 },
            'Eastern': { lat: 6.2000, lon: -0.2000 },
            'Volta': { lat: 6.6000, lon: 0.4500 },
            'Northern': { lat: 9.4000, lon: -0.8500 }
        };

        const city1 = ghanaCities[loc1.region] || ghanaCities['Greater Accra'];
        const city2 = ghanaCities[loc2.region] || ghanaCities['Greater Accra'];

        const R = 6371; // Earth's radius in km
        const dLat = (city2.lat - city1.lat) * Math.PI / 180;
        const dLon = (city2.lon - city1.lon) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) + 
                 Math.cos(city1.lat * Math.PI / 180) * Math.cos(city2.lat * Math.PI / 180) * 
                 Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    calculateScheduleOverlap(avail1, avail2) {
        // Simple schedule overlap calculation
        const weekdays1 = new Set(avail1.weekdays || []);
        const weekdays2 = new Set(avail2.weekdays || []);
        const weekend1 = new Set(avail1.weekends || []);
        const weekend2 = new Set(avail2.weekends || []);

        const weekdayOverlap = weekdays1.size > 0 && weekdays2.size > 0 ? 
            [...weekdays1].filter(day => weekdays2.has(day)).length * 25 : 0;
        
        const weekendOverlap = weekend1.size > 0 && weekend2.size > 0 ? 
            [...weekend1].filter(day => weekend2.has(day)).length * 50 : 0;

        return Math.min(100, weekdayOverlap + weekendOverlap);
    }

    generateMatchMessage(score, reasons) {
        if (score >= 90) return "Perfect match! 🎯";
        if (score >= 80) return "Excellent compatibility! ⭐";
        if (score >= 70) return "Great study partner! 🎓";
        if (score >= 60) return "Good match for collaboration! 🤝";
        return "Potential partner";
    }

    getMatchVisual(score) {
        const colors = {
            90: '#28a745', // Green for perfect
            80: '#17a2b8', // Blue for excellent
            70: '#ffc107', // Yellow for great
            60: '#fd7e14', // Orange for good
            0: '#6c757d'   // Gray for potential
        };
        
        const color = Object.keys(colors).find(key => score >= key);
        return colors[color] || colors[0];
    }
}
