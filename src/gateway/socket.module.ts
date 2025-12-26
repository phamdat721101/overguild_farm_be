import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
    imports: [
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '7d' }, // Default, can be overridden
            }),
        }),
    ],
    providers: [GameGateway],
    exports: [GameGateway],
})
export class SocketModule { }
