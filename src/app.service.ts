import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
  getStatus() {
    return { message: "Farm backend connected to Supabase" };
  }
}
