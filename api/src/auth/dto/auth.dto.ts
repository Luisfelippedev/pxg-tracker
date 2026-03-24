import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty({ message: 'Email é obrigatório' })
  @IsEmail({}, { message: 'Informe um email válido' })
  email!: string;

  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @IsString({ message: 'Senha inválida' })
  @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres' })
  password!: string;
}

export class LoginDto {
  @IsNotEmpty({ message: 'Email é obrigatório' })
  @IsEmail({}, { message: 'Informe um email válido' })
  email!: string;

  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @IsString({ message: 'Senha inválida' })
  password!: string;
}

export class RefreshTokenDto {
  @IsNotEmpty({ message: 'Refresh token é obrigatório' })
  @IsString({ message: 'Refresh token inválido' })
  refreshToken!: string;
}
