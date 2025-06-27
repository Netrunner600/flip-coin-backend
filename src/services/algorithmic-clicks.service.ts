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
}

@Injectable()
export class AlgorithmicClicksService {
  private readonly logger = new Logger(AlgorithmicClicksService.name);
  private activeJobs: ActiveClickJob[] = [];
  private clickInterval: NodeJS.Timeout | null = null;

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
  }

  @Cron('*/60 * * * * *') // Run every 60 seconds
  async handleAlgorithmicClicks() {
    try {
      this.logger.log('🚀 Starting new algorithmic clicks cycle...');
      
      // Clear any existing jobs
      this.clearActiveJobs();
      
      // Randomly pick 1-3 countries
      const numCountries = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
      const selectedCountries = this.getRandomCountries(numCountries);

      this.logger.log(`🎯 Selected ${numCountries} countries: ${selectedCountries.map(c => c.name).join(', ')}`);

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
    }
  }

  private logJobSummary() {
    this.logger.log('📊 JOB SUMMARY:');
    this.activeJobs.forEach((job, index) => {
      this.logger.log(`  ${index + 1}. ${job.country.name}: ${job.scenario.count} ${job.scenario.type} clicks (${job.clicksPerSecond.toFixed(2)}/sec) on ${job.characters.length} characters`);
    });
  }

  private async createClickJob(country: CountryConfig, scenario: ClickScenario): Promise<ActiveClickJob | null> {
    try {
      // Get all characters
      const characters = await this.characterService.getAllCharactersForAlgorithmic();
      
      if (!characters || characters.length === 0) {
        this.logger.warn('No characters found for algorithmic clicks');
        return null;
      }

      // Select 2-5 random characters
      const numCharacters = Math.floor(Math.random() * 4) + 2; // 2, 3, 4, or 5
      const shuffledCharacters = [...characters];
      for (let i = shuffledCharacters.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledCharacters[i], shuffledCharacters[j]] = [shuffledCharacters[j], shuffledCharacters[i]];
      }
      const selectedCharacters = shuffledCharacters.slice(0, numCharacters);
      
      // Generate a fake session ID for algorithmic clicks
      const sessionId = `algo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Calculate clicks per second (distribute evenly across 60 seconds)
      const clicksPerSecond = scenario.count / 60;

      const job: ActiveClickJob = {
        country,
        scenario,
        characters: selectedCharacters.map(char => ({
          id: char.id,
          name: char.name
        })),
        sessionId,
        totalClicks: scenario.count,
        clicksPerSecond,
        startTime: Date.now(),
        lastClickTime: 0,
        clicksCompleted: 0
      };

      const characterNames = selectedCharacters.map(char => char.name).join(', ');
      this.logger.log(`Created job: ${scenario.count} ${scenario.type} clicks for ${country.name} on ${numCharacters} characters (${characterNames}) - ${clicksPerSecond.toFixed(2)} clicks/sec`);
      
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

    // Run clicks every 100ms to ensure smooth distribution
    this.clickInterval = setInterval(() => {
      this.processClickJobs();
    }, 100); // 100ms intervals = 10 times per second
  }

  private async processClickJobs() {
    const currentTime = Date.now();
    
    for (const job of this.activeJobs) {
      // Calculate how many clicks should have been completed by now
      const elapsedSeconds = (currentTime - job.startTime) / 1000;
      const expectedClicks = Math.floor(elapsedSeconds * job.clicksPerSecond);
      
      // If we need to perform more clicks
      if (expectedClicks > job.clicksCompleted && job.clicksCompleted < job.totalClicks) {
        const clicksToPerform = Math.min(
          expectedClicks - job.clicksCompleted,
          job.totalClicks - job.clicksCompleted
        );

        // Perform the clicks, distributing across all characters
        for (let i = 0; i < clicksToPerform; i++) {
          if (job.clicksCompleted >= job.totalClicks) break;
          
          try {
            const increment = job.scenario.type === 'thumbsUp';
            
            // Cycle through characters to distribute clicks evenly
            const characterIndex = job.clicksCompleted % job.characters.length;
            const selectedCharacter = job.characters[characterIndex];
            
            await this.characterService.updateCharacterPoints(
              selectedCharacter.id,
              increment,
              job.country.name,
              job.country.code,
              job.sessionId
            );

            job.clicksCompleted++;
            job.lastClickTime = currentTime;
          } catch (error) {
            this.logger.error(`Error performing click for ${job.country.name}:`, error);
          }
        }
      }
    }

    // Log progress every 10 seconds
    const elapsedSeconds = (currentTime - this.activeJobs[0]?.startTime || 0) / 1000;
    if (elapsedSeconds > 0 && Math.floor(elapsedSeconds) % 10 === 0 && Math.floor(elapsedSeconds) <= 50) {
      this.logProgress();
    }

    // Check if all jobs are complete
    const allComplete = this.activeJobs.every(job => job.clicksCompleted >= job.totalClicks);
    if (allComplete) {
      this.logger.log('🎉 All click jobs completed');
      this.clearActiveJobs();
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
    // Add more randomness by using timestamp as seed
    const randomIndex = Math.floor((Math.random() + Date.now() % 1000 / 1000) * this.clickScenarios.length) % this.clickScenarios.length;
    return this.clickScenarios[randomIndex];
  }
} 