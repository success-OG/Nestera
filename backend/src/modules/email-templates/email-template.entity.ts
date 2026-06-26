import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('email_templates')
export class EmailTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @OneToMany(() => EmailTemplateVersion, (v) => v.template, { cascade: true })
  versions: EmailTemplateVersion[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('email_template_versions')
export class EmailTemplateVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => EmailTemplate, (t) => t.versions, { onDelete: 'CASCADE' })
  template: EmailTemplate;

  @Column({ type: 'int' })
  version: number;

  @Column()
  subject: string;

  @Column({ type: 'text', nullable: true })
  html?: string;

  @Column({ type: 'text', nullable: true })
  text?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: any;

  @Column({ default: false })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('email_ab_tests')
export class EmailAbTest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @ManyToOne(() => EmailTemplate, { onDelete: 'CASCADE' })
  template: EmailTemplate;

  @OneToMany(() => EmailAbVariant, (v) => v.abTest, { cascade: true })
  variants: EmailAbVariant[];

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('email_ab_variants')
export class EmailAbVariant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => EmailAbTest, (a) => a.variants, { onDelete: 'CASCADE' })
  abTest: EmailAbTest;

  @ManyToOne(() => EmailTemplateVersion, { eager: true })
  version: EmailTemplateVersion;

  @Column({ type: 'int', default: 1 })
  weight: number;

  @Column({ nullable: true })
  key?: string;
}
