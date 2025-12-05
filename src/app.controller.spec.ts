import { Test, TestingModule } from "@nestjs/testing";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

const appServiceMock = {
  getStatus: jest
    .fn()
    .mockReturnValue({ message: "Farm backend connected to Supabase" }),
};

describe("AppController", () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: appServiceMock,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return service status", () => {
    expect(appController.getStatus()).toEqual({
      message: "Farm backend connected to Supabase",
    });
    expect(appServiceMock.getStatus).toHaveBeenCalled();
  });
});
