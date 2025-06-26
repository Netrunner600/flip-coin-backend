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

@Injectable()
export class AlgorithmicClicksService {
  private readonly logger = new Logger(AlgorithmicClicksService.name);

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
      this.logger.log('Starting algorithmic clicks execution...');
      
      // Randomly pick 1-3 countries
      const numCountries = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
      const selectedCountries = this.getRandomCountries(numCountries);

      this.logger.log(`Selected ${numCountries} countries: ${selectedCountries.map(c => c.name).join(', ')}`);

      // Perform clicks for each selected country
      for (const country of selectedCountries) {
        const scenario = this.getRandomScenario();
        await this.performClicksForCountry(country, scenario);
        
        // Add delay between countries
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds delay between countries
      }

      this.logger.log('Algorithmic clicks execution completed');
    } catch (error) {
      this.logger.error('Error performing algorithmic clicks:', error);
    }
  }

  private getRandomCountries(count: number): CountryConfig[] {
    const shuffled = [...this.popularCountries].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  private getRandomScenario(): ClickScenario {
    return this.clickScenarios[Math.floor(Math.random() * this.clickScenarios.length)];
  }

  private async performClicksForCountry(country: CountryConfig, scenario: ClickScenario) {
    try {
      // Get all characters
      const characters = await this.characterService.getAllCharactersForAlgorithmic();
      
      if (!characters || characters.length === 0) {
        this.logger.warn('No characters found for algorithmic clicks');
        return;
      }

      // Select a random character
      const randomCharacter = characters[Math.floor(Math.random() * characters.length)];
      
      // Generate a fake session ID for algorithmic clicks
      const fakeSessionId = `algo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      this.logger.log(`Performing ${scenario.count} ${scenario.type} clicks for ${country.name} on character ${randomCharacter.name}`);

      // Perform the clicks in smaller batches with longer delays
      const batchSize = 10; // Reduced batch size
      const totalBatches = Math.ceil(scenario.count / batchSize);

      for (let batch = 0; batch < totalBatches; batch++) {
        const batchStart = batch * batchSize;
        const batchEnd = Math.min((batch + 1) * batchSize, scenario.count);
        const batchCount = batchEnd - batchStart;

        // Perform clicks for this batch
        for (let i = 0; i < batchCount; i++) {
          const increment = scenario.type === 'thumbsUp';
          
          await this.characterService.updateCharacterPoints(
            randomCharacter.id,
            increment,
            country.name,
            country.code,
            fakeSessionId
          );

          // Add delay between individual clicks
          await new Promise(resolve => setTimeout(resolve, 5)); // 100ms delay between each click
        }

        // Add longer delay between batches
        if (batch < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 300)); // 500ms delay between batches
        }
      }

      this.logger.log(`Completed ${scenario.count} ${scenario.type} clicks for ${country.name}`);
    } catch (error) {
      this.logger.error(`Error performing clicks for ${country.name}:`, error);
    }
  }
} 