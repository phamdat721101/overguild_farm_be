import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CheckInDto } from "./dto/check-in.dto";
import { CreateEventDto } from "./dto/create-event.dto";
import { AdminCheckInDto } from "./dto/admin-check-in.dto";
import { EventService } from "./event.service";

@ApiTags("Events")
@Controller("events")
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Create a new event (organizer)",
    description:
      "Create a new event in FundX using the caller wallet as creator_address. This is used by OverGuild organizers.",
  })
  @ApiResponse({
    status: 201,
    description: "Event created successfully",
    schema: {
      example: {
        id: "c91fef29-f5a4-4e74-b6ee-48bab97d95be",
        name: "OverGuild Builder Meetup #1",
        description: "Meet other OverGuild builders and share your projects.",
        location: "HCMC, Vietnam",
        startTime: "2025-12-10T18:00:00.000Z",
        endTime: "2025-12-10T21:00:00.000Z",
        status: "pending",
      },
    },
  })
  async createEvent(
    @CurrentUser("walletAddress") walletAddress: string,
    @Body() dto: CreateEventDto,
  ) {
    return this.eventService.createEvent(walletAddress, dto);
  }

  @Post("check-in")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Check in to a nearby event and receive seeds" })
  @ApiResponse({ status: 200, description: "Successfully checked in" })
  @ApiResponse({ status: 404, description: "No nearby events found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async checkIn(@CurrentUser("sub") userId: string, @Body() dto: CheckInDto) {
    return this.eventService.checkIn(userId, dto);
  }

  @Get("active")
  @ApiOperation({ summary: "Get all active events" })
  @ApiResponse({ status: 200, description: "Returns list of active events" })
  async getActiveEvents() {
    return this.eventService.getActiveEvents();
  }

  @Get(":eventId")
  @ApiOperation({ summary: "Get a single event by ID" })
  @ApiResponse({ status: 200, description: "Returns event detail" })
  @ApiResponse({ status: 404, description: "Event not found" })
  async getEventById(@Param("eventId") eventId: string) {
    return this.eventService.getEventById(eventId);
  }

  @Post(":eventId/admin-check-in")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Admin check-in user by scanning QR",
    description:
      "Used by event admin: scan user QR (from /user/qr), extract userId, and call this endpoint to check them in to the event.",
  })
  @ApiResponse({
    status: 200,
    description: "User successfully checked in by admin",
  })
  @ApiResponse({
    status: 400,
    description: "User already checked in or event invalid",
  })
  @ApiResponse({ status: 404, description: "Event not found" })
  async adminCheckIn(
    @Param("eventId") eventId: string,
    @Body() dto: AdminCheckInDto,
  ) {
    // Re-use existing check-in logic, but with target userId scanned from QR
    return this.eventService.checkIn(dto.userId, {
      eventId,
      verificationCode: dto.verificationCode,
    });
  }
}
