import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID } from "class-validator";

export class AdminCheckInDto {
  @ApiProperty({
    description: "Target user ID (from /user/qr -> qrData / userId)",
    example: "69aea000-8ba2-494c-bc0f-d3ed6b3741b3",
  })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({
    description: "Optional verification code or secret for the event",
    example: "SECRET_ADMIN_CODE",
  })
  @IsOptional()
  @IsString()
  verificationCode?: string;
}
