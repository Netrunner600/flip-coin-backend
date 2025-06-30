import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CharacterService } from '../character/character.service';

interface CountryConfig {
  name: string;
  code: string;
}

interface ClickScenario {
  count: number;
  type: 'thumbsUp' | 'middleFinger';
}

interface CharacterClickScenario {
  id: string;
  name: string;
  count: number;
  type: 'thumbsUp' | 'middleFinger';
}

interface ActiveClickJob {
  country: CountryConfig;
  scenario: ClickScenario;
  characters: Array<{
    id: string;
    name: string;
  }>;
  sessionId: string;
  totalClicks: number;
  clicksPerSecond: number;
  startTime: number;
  lastClickTime: number;
  clicksCompleted: number;
  pendingUpdates: Array<{
    characterId: string;
    increment: boolean;
    countryName: string;
    countryCode: string;
  }>;
  characterScenarios?: CharacterClickScenario[];
}

@Injectable()
export class AlgorithmicClicksService {
  private readonly logger = new Logger(AlgorithmicClicksService.name);
  private activeJobs: ActiveClickJob[] = [];
  private clickInterval: NodeJS.Timeout | null = null;
  private readonly MAX_CONCURRENT_CLICKS = 5; // Limit concurrent DB operations
  private processingClicks = false; // Flag to prevent overlapping processing
  private allCharacters: Array<{ id: string; name: string; avatarUrl: string }> = []; // Cache characters
  private lastCharacterFetch = 0; // Track when we last fetched characters
  private isAlgorithmicCycleRunning = false; // Flag to prevent multiple cycles

  private readonly popularCountries: CountryConfig[] = [
    { name: 'Hong Kong', code: 'HK' },
    { name: 'Taiwan', code: 'TW' },
    { name: 'Japan', code: 'JP' },
    { name: 'South Korea', code: 'KR' },
    { name: 'Malaysia', code: 'MY' },
    { name: 'Saudi Arabia', code: 'SA' },
    { name: 'United States', code: 'US' },
    { name: 'Indonesia', code: 'ID' },
    { name: 'Finland', code: 'FI' },
    { name: 'India', code: 'IN' },
    { name: 'Spain', code: 'ES' },
    { name: 'Thailand', code: 'TH' },
    { name: 'Australia', code: 'AU' },
    { name: 'Vietnam', code: 'VN' },
    { name: 'France', code: 'FR' },
    { name: 'Egypt', code: 'EG' },
    { name: 'Mexico', code: 'MX' },
    { name: 'Philippines', code: 'PH' },
    { name: 'Singapore', code: 'SG' },
    { name: 'Germany', code: 'DE' }
  ];

  private readonly clickScenarios: ClickScenario[] = [
    { count: 300, type: 'thumbsUp' },
    { count: 300, type: 'middleFinger' },
    { count: 500, type: 'thumbsUp' },
    { count: 500, type: 'middleFinger' },
    { count: 1000, type: 'thumbsUp' },
    { count: 1000, type: 'middleFinger' }
  ];

  constructor(private readonly characterService: CharacterService) {
    this.logger.log('Algorithmic clicks service initialized - will run every 60 seconds');
    this.initializeCharacters();
  }

  private async initializeCharacters() {
    try {
      this.allCharacters = await this.characterService.getAllCharactersForAlgorithmic();
      this.lastCharacterFetch = Date.now();
      this.logger.log(`📚 Cached ${this.allCharacters.length} characters for algorithmic clicks`);
    } catch (error) {
      this.logger.error('Failed to initialize characters:', error);
    }
  }

  @Cron('*/60 * * * * *') // Run every 60 seconds
  async handleAlgorithmicClicks() {
    try {
      if (this.isAlgorithmicCycleRunning) {
        this.logger.log('⏳ Algorithmic clicks cycle is already running');
        return;
      }

      this.isAlgorithmicCycleRunning = true;
      this.logger.log('🚀 Starting new algorithmic clicks cycle...');
      
      // Clear any existing jobs
      this.clearActiveJobs();
      
      // Refresh characters cache every 5 minutes
      if (Date.now() - this.lastCharacterFetch > 5 * 60 * 1000) {
        await this.initializeCharacters();
      }
      
      // Randomly pick 2-6 countries (as requested)
      const numCountries = Math.floor(Math.random() * 5) + 2; // 2, 3, 4, 5, or 6
      const selectedCountries = this.getRandomCountries(numCountries);

      // this.logger.log(`🎯 Selected ${numCountries} countries: ${selectedCountries.map(c => c.name).join(', ')}`);

      // Create click jobs for each selected country
      const jobs: ActiveClickJob[] = [];
      
      for (const country of selectedCountries) {
        const scenario = this.getRandomScenario();
        const job = await this.createClickJob(country, scenario);
        if (job) {
          jobs.push(job);
        }
      }

      if (jobs.length === 0) {
        this.logger.warn('⚠️ No valid click jobs created');
        return;
      }

      // Set the active jobs
      this.activeJobs = jobs;
      
      // Start the click distribution
      this.startClickDistribution();

      this.logger.log(`✅ Started ${jobs.length} click jobs for the next 60 seconds`);
      
      // Log summary of all jobs
      this.logJobSummary();
    } catch (error) {
      this.logger.error('❌ Error starting algorithmic clicks:', error);
    } finally {
      this.isAlgorithmicCycleRunning = false;
    }
  }

  private logJobSummary() {
    this.logger.log('📊 JOB SUMMARY:');
    this.activeJobs.forEach((job, index) => {
      this.logger.log(`  ${index + 1}. ${job.country.name}: ${job.scenario.count} ${job.scenario.type} clicks (${job.clicksPerSecond.toFixed(2)}/sec) on ${job.characters.length} characters`);
    });
  }

  private async createClickJob(country: CountryConfig, _scenario: ClickScenario): Promise<ActiveClickJob | null> {
    try {
      if (!this.allCharacters || this.allCharacters.length === 0) {
        this.logger.warn('No characters available for algorithmic clicks');
        return null;
      }

      // Select 3-5 random characters (as requested)
      const numCharacters = Math.floor(Math.random() * 3) + 3; // 3, 4, or 5
      const shuffledCharacters = [...this.allCharacters];
      for (let i = shuffledCharacters.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledCharacters[i], shuffledCharacters[j]] = [shuffledCharacters[j], shuffledCharacters[i]];
      }
      const selectedCharacters = shuffledCharacters.slice(0, numCharacters);

      // Generate a fake session ID for algorithmic clicks
      const sessionId = `algo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // For each character, generate its own random click scenario
      const characterScenarios: CharacterClickScenario[] = selectedCharacters.map(char => ({
        id: char.id,
        name: char.name,
        count: Math.max(Math.floor(Math.random() * (1500 - 300 + 1)) + 300, 300), // Enforce minimum 300
        type: Math.random() < 0.5 ? 'thumbsUp' : 'middleFinger',
      }));

      // Calculate total clicks for the job (sum of all character clicks)
      const totalClicks = characterScenarios.reduce((sum, c) => sum + c.count, 0);
      const clicksPerSecond = totalClicks / 60;

      const job: ActiveClickJob = {
        country,
        scenario: { count: totalClicks, type: 'thumbsUp' }, // scenario is not used anymore, but keep for compatibility
        characters: characterScenarios.map(({ id, name }) => ({ id, name })),
        sessionId,
        totalClicks,
        clicksPerSecond,
        startTime: Date.now(),
        lastClickTime: 0,
        clicksCompleted: totalClicks, // Mark as completed immediately
        pendingUpdates: [],
        // @ts-ignore
        characterScenarios, // add this property for use in final calculation
      };

      const characterNames = characterScenarios.map(char => `${char.name} (${char.count} ${char.type})`).join(', ');
      this.logger.log(`Created job: ${totalClicks} total clicks for ${country.name} on ${numCharacters} characters (${characterNames}) - ${clicksPerSecond.toFixed(2)} clicks/sec`);

      return job;
    } catch (error) {
      this.logger.error(`Error creating click job for ${country.name}:`, error);
      return null;
    }
  }

  private startClickDistribution() {
    // Clear any existing interval
    if (this.clickInterval) {
      clearInterval(this.clickInterval);
    }

    // Run clicks every 1000ms (1 second) to reduce frequency and batch better
    this.clickInterval = setInterval(() => {
      this.processClickJobs();
    }, 1000); // 1000ms intervals = 1 time per second
  }

  private async processClickJobs() {
    // Prevent overlapping processing
    if (this.processingClicks) {
      return;
    }
    
    this.processingClicks = true;
    const currentTime = Date.now();
    
    try {
      // Check if all jobs are complete
      const allComplete = this.activeJobs.every(job => job.clicksCompleted >= job.totalClicks);
      if (allComplete) {
        // Calculate final counts for all jobs at once
        await this.calculateAndProcessFinalCounts();
        await this.sendFinalEvents();
        this.clearActiveJobs();
        return;
      }

      // Log progress every 30 seconds (reduced frequency)
      const elapsedSeconds = (currentTime - this.activeJobs[0]?.startTime || 0) / 1000;
      if (elapsedSeconds > 0 && Math.floor(elapsedSeconds) % 30 === 0 && Math.floor(elapsedSeconds) <= 30) {
        this.logProgress();
      }
    } catch (error) {
      this.logger.error('❌ Error in processClickJobs:', error);
    } finally {
      this.processingClicks = false;
    }
  }

  private async calculateAndProcessFinalCounts() {
    try {
      this.logger.log('📊 Calculating final click counts for all jobs...');
      const finalCounts = new Map<string, {
        characterId: string;
        countryName: string;
        countryCode: string;
        sessionId: string;
        totalPlus: number;
        totalMinus: number;
        pointsChange: number;
      }>();

      for (const job of this.activeJobs) {
        // @ts-ignore
        const characterScenarios: CharacterClickScenario[] = job.characterScenarios || [];
        for (const scenario of characterScenarios) {
          const isIncrement = scenario.type === 'thumbsUp';
          const key = `${scenario.id}_${job.country.name}_${job.country.code}`;
          if (finalCounts.has(key)) {
            const existing = finalCounts.get(key)!;
            if (isIncrement) {
              existing.totalPlus += scenario.count;
              existing.pointsChange += scenario.count;
            } else {
              existing.totalMinus += scenario.count;
              existing.pointsChange -= scenario.count;
            }
          } else {
            finalCounts.set(key, {
              characterId: scenario.id,
              countryName: job.country.name,
              countryCode: job.country.code,
              sessionId: job.sessionId,
              totalPlus: isIncrement ? scenario.count : 0,
              totalMinus: isIncrement ? 0 : scenario.count,
              pointsChange: isIncrement ? scenario.count : -scenario.count
            });
          }
        }
      }

      // Process all final counts
      const batchPromises = Array.from(finalCounts.values()).map(async (count) => {
        try {
          await this.characterService.batchUpdatePointsSilent(
            count.sessionId,
            {
              points: [{
                characterId: count.characterId,
                totalPlus: count.totalPlus,
                totalMinus: count.totalMinus,
                pointsChange: count.pointsChange,
                lastUpdate: Date.now()
              }]
            },
            count.countryName,
            count.countryCode
          );
          this.logger.debug(`Final batch: ${count.characterId} (${count.countryName}) - +${count.totalPlus} -${count.totalMinus} = ${count.pointsChange}`);
        } catch (error) {
          this.logger.error(`Error processing final count for ${count.characterId}:`, error);
        }
      });
      await Promise.all(batchPromises);
      this.logger.log(`✅ Processed ${finalCounts.size} final batches with total counts`);
    } catch (error) {
      this.logger.error('❌ Error calculating final counts:', error);
    }
  }

  private logProgress() {
    this.logger.log('📈 PROGRESS UPDATE:');
    this.activeJobs.forEach((job, index) => {
      const elapsedSeconds = (Date.now() - job.startTime) / 1000;
      const progress = ((job.clicksCompleted / job.totalClicks) * 100).toFixed(1);
      const actualRate = (job.clicksCompleted / elapsedSeconds).toFixed(2);
      this.logger.log(`  ${index + 1}. ${job.country.name}: ${job.clicksCompleted}/${job.totalClicks} clicks (${progress}%) - Rate: ${actualRate}/sec`);
    });
  }

  private clearActiveJobs() {
    if (this.clickInterval) {
      clearInterval(this.clickInterval);
      this.clickInterval = null;
    }
    this.activeJobs = [];
  }

  private getRandomCountries(count: number): CountryConfig[] {
    // Use a more robust shuffling algorithm
    const shuffled = [...this.popularCountries];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
  }

  private getRandomScenario(): ClickScenario {
    // Generate random click count between 300 and 1500
    const randomClickCount = Math.floor(Math.random() * (1500 - 300 + 1)) + 300;
    
    const randomType = Math.random() < Math.random() ? 'thumbsUp' : 'middleFinger';

    return {
      count: randomClickCount,
      type: randomType
    };
  }

  private async sendFinalEvents() {
    try {
      this.logger.log('📡 Sending final events after algorithmic clicks cycle...');
      
      // Collect all unique characters that were updated
      const updatedCharacters = new Set<string>();
      let totalClicks = 0;

      for (const job of this.activeJobs) {
        for (const character of job.characters) {
          updatedCharacters.add(character.id);
        }
        totalClicks += job.clicksCompleted;
      }

      // Send socket events for all updated characters
      if (updatedCharacters.size > 0) {
        this.logger.log(`✅ Sending events for ${updatedCharacters.size} characters after ${totalClicks} total clicks`);
        
        // Send one update per character to trigger socket events
        for (const characterId of updatedCharacters) {
          try {
             const randomIndex = Math.floor(Math.random() * this.popularCountries.length);
  const selectedCountry = this.popularCountries[randomIndex];
            await this.characterService.updateCharacterPoints(
              characterId,
              true, // This doesn't matter since we're just triggering events
              selectedCountry.name, // Generic country for summary
              selectedCountry.code,
              `algo_final_${Date.now()}`
            );
          } catch (error) {
            this.logger.error(`Error sending final event for character ${characterId}:`, error);
          }
        }
      }

      this.logger.log(`✅ Final events sent for ${updatedCharacters.size} characters`);
    } catch (error) {
      this.logger.error('❌ Error sending final events:', error);
    }
  }
} 