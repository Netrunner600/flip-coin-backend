import { Controller, Get, Patch, Param, Query, Req, Res, Post, UseInterceptors, Body, UploadedFile } from '@nestjs/common';
import { Request, Response } from 'express';
import { CharacterService } from './character.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from 'src/config/multer.config';


@Controller('characters')
export class CharacterController {
    constructor(private readonly characterService: CharacterService) { }

    @Get()
    async getAllCharacters(@Query('userId') userId: string, // Extract userId from query
        @Req() req: Request,
        @Res() res: Response) {
        console.log('User IP:', req.ip);
        const characters = await this.characterService.getAllCharacters(userId)
        return res.status(200).json({
            message: 'Character list retrieved successfully',
            data: characters,
        });
    }

    @Patch(':id')
    updateCharacterPoints(
        @Param('id') id: string,
        @Query('increment') increment: string,
        @Query('country') country: string,
        @Query('countryCode') countryCode: string,
        @Query('sessionId') sessionId: string,
        
    ) {
        return this.characterService.updateCharacterPoints(id, increment === 'true', country, countryCode, sessionId);
    }

    @Get("stats")
    async getStats() {
        console.log("HHHHHHHHHHHHHHHHHHHHHHHHHHH")
        return this.characterService.getStats();
    }

    // Api for upload Characters
    @Post('uploadCharacter')
    @UseInterceptors(FileInterceptor('file', multerConfig))
    async uploadCharacter(
        @UploadedFile() file,
        @Body() body: { name: string; points: number },
        @Res() res: Response
    ) {
        if (!file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        // Construct image path with the correct extension
        const avatarPath = `/public/avatars/${file.filename}`;

        // Save to MySQL with the correct file path
        const newCharacter = await this.characterService.createCharacter({
            name: body.name,
            points: Number(body.points),
            avatarUrl: avatarPath,
        });

        return res.json({ success: true, character: newCharacter });
    }


    @Get("character-points")
    async characterPoints(@Query('id') id: string, @Query('userId') userId: string) {
        console.log("HHHHHHHHHHHHHHHHHHHHHHHHHHH")
        return this.characterService.characterPointsData(id,userId);
    }

    @Post('batch-update')
    async batchUpdatePoints(
        @Body() data: { 
            sessionId: string; 
            points: Array<{ 
                characterId: string; 
                totalPlus: number;
                totalMinus: number;
                pointsChange: number;
                lastUpdate: number;
            }>;
        }
    ) {
        return this.characterService.batchUpdatePoints(data.sessionId, data);
    }

}
