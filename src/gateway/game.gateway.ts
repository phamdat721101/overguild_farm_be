import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';

@WebSocketGateway({
    namespace: '/game',
    cors: {
        origin: '*', // Allow all origins for now (adjust for production)
    },
})
export class GameGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;
    private readonly logger = new Logger(GameGateway.name);

    constructor(private readonly jwtService: JwtService) { }

    afterInit(server: Server) {
        this.logger.log('Game WebSocket Gateway initialized');
    }

    async handleConnection(client: Socket) {
        try {
            // 1. Extract token from handshake query or auth headers
            const token =
                client.handshake.auth?.token || client.handshake.query?.token;

            if (!token) {
                this.logger.warn(`Client ${client.id} tried to connect without token`);
                client.disconnect();
                return;
            }

            // 2. Verify token
            const payload = await this.jwtService.verifyAsync(token);

            // 3. Store user info in socket instance
            client.data.user = payload;

            // 4. Join a room specific to this user (e.g., "user:123")
            // This allows us to target specific users for updates
            const userRoom = `user:${payload.sub}`;
            await client.join(userRoom);

            this.logger.log(
                `Client connected: ${client.id} (User: ${payload.sub}) joined room ${userRoom}`
            );
        } catch (error) {
            this.logger.error(`Connection unauthorized: ${error.message}`);
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    // ============================================
    // Event Listeners (from Internal Services)
    // ============================================

    @OnEvent('inventory.updated')
    handleInventoryUpdate(payload: { userId: string; items: any[] }) {
        this.server
            .to(`user:${payload.userId}`)
            .emit('inventory_update', payload.items);
    }

    @OnEvent('plant.updated')
    handlePlantUpdate(payload: { userId: string; plant: any }) {
        this.server
            .to(`user:${payload.userId}`)
            .emit('plant_update', {
                landId: payload.plant.landId,
                plant: payload.plant
            });
    }

    @OnEvent('land.updated')
    handleLandUpdate(payload: { userId: string; land?: any; lands?: any[] }) {
        const lands = payload.lands || (payload.land ? [payload.land] : []);
        this.server
            .to(`user:${payload.userId}`)
            .emit('land_update', lands);
    }

    @OnEvent('currency.updated')
    handleCurrencyUpdate(payload: { userId: string; gold: number; gem: number }) {
        this.server
            .to(`user:${payload.userId}`)
            .emit('currency_update', { gold: payload.gold, gem: payload.gem });
    }
}
