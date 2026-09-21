import { Body, Controller, Get, Inject, Post, Put } from '@midwayjs/core';
import { Context } from '@midwayjs/koa';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@midwayjs/swagger';
import { AuthService } from './auth.service';
import { ChangePasswordDTO, LoginDTO, RegisterDTO, SmsCodeDTO, UpdateProfileDTO } from './auth.dto';
import { Auth, CurrentUserParam, CurrentUser } from '../../common/decorators';

@ApiTags(['公共-认证'])
@Controller('/api/auth')
export class AuthController {
  @Inject()
  authService: AuthService;

  @ApiOperation({ summary: '发送短信验证码（开发期固定123456）' })
  @Post('/sms-code')
  async sendSmsCode(@Body() dto: SmsCodeDTO) {
    await this.authService.sendSmsCode(dto.phone);
    return { sent: true, tip: '开发环境验证码固定为 123456' };
  }

  @ApiOperation({ summary: '注册' })
  @Post('/register')
  async register(@Body() dto: RegisterDTO) {
    return this.authService.register(dto.phone, dto.password, dto.smsCode, dto.nickname);
  }

  @ApiOperation({ summary: '登录（游客/商家/管理员统一入口）' })
  @Post('/login')
  async login(@Body() dto: LoginDTO) {
    return this.authService.login(dto.phone, dto.password);
  }

  @ApiOperation({ summary: '刷新 token' })
  @Post('/refresh')
  async refresh(@Body('refreshToken') refreshToken: string) {
    if (!refreshToken) {
      throw new Error('refreshToken 不能为空');
    }
    return this.authService.refresh(refreshToken);
  }

  @ApiOperation({ summary: '当前用户信息' })
  @Auth()
  @Get('/profile')
  async profile(@CurrentUserParam() user: CurrentUser) {
    return this.authService.profile(user.userId);
  }

  @ApiOperation({ summary: '修改个人资料' })
  @Auth()
  @Put('/profile')
  async updateProfile(@Body() dto: UpdateProfileDTO, @CurrentUserParam() user: CurrentUser) {
    return this.authService.updateProfile(user.userId, dto);
  }

  @ApiOperation({ summary: '修改密码' })
  @Auth()
  @Put('/password')
  async changePassword(@Body() dto: ChangePasswordDTO, @CurrentUserParam() user: CurrentUser) {
    return this.authService.changePassword(user.userId, dto.oldPassword, dto.newPassword);
  }
}
