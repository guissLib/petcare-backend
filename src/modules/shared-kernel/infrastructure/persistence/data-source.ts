import { DataSource } from 'typeorm';
import { createTypeOrmOptions } from './typeorm.config';

export default new DataSource(createTypeOrmOptions());
