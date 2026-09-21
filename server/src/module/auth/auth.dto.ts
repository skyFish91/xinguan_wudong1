import { ApiProperty } from '@midwayjs/swagger';
import { IsNotEmpty, Length, Matches } from 'class-validator';

/** 发送验证码请求 */
export class SmsCodeDTO {
  @ApiProperty({ description: '手机号' })
  @IsNotEmpty({ message: '手机号不能为空' })
  @Matches(/^1\d{10}$/, { message: '手机号格式不正确' })
  phone: string;
}

/** 注册请求 */
export class RegisterDTO {
  @ApiProperty({ description: '手机号' })
  @IsNotEmpty({ message: '手机号不能为空' })
  @Matches(/^1\d{10}$/, { message: '手机号格式不正确' })
  phone: string;

  @ApiProperty({ description: '密码（8-20位，至少含字母与数字）' })
  @Length(8, 20, { message: '密码长度 8-20 位' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[\S]{8,20}$/, { message: '密码须同时包含字母与数字' })
  password: string;

  @ApiProperty({ description: '验证码' })
  @IsNotEmpty({ message: '验证码不能为空' })
  smsCode: string;

  @ApiProperty({ description: '昵称', required: false })
  nickname?: string;
}

/** 登录请求 */
export class LoginDTO {
  @ApiProperty({ description: '手机号' })
  @IsNotEmpty({ message: '手机号不能为空' })
  phone: string;

  @ApiProperty({ description: '密码' })
  @IsNotEmpty({ message: '密码不能为空' })
  password: string;
}

/** 修改资料请求 */
export class UpdateProfileDTO {
  @ApiProperty({ description: '昵称', required: false })
  nickname?: string;

  @ApiProperty({ description: '头像', required: false })
  avatar?: string;

  @ApiProperty({ description: '性别 0未知1男2女', required: false })
  gender?: number;

  @ApiProperty({ description: '地区', required: false })
  region?: string;

  @ApiProperty({ description: '个人简介', required: false })
  bio?: string;
}

/** 修改密码请求 */
export class ChangePasswordDTO {
  @ApiProperty({ description: '原密码' })
  @IsNotEmpty({ message: '原密码不能为空' })
  oldPassword: string;

  @ApiProperty({ description: '新密码（8-20位，至少含字母与数字）' })
  @Length(8, 20, { message: '密码长度 8-20 位' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[\S]{8,20}$/, { message: '密码须同时包含字母与数字' })
  newPassword: string;
}
