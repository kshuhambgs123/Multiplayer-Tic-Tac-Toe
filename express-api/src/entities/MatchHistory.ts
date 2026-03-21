import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity()
export class MatchHistory {
    @PrimaryGeneratedColumn()
    id!: number; // Fixed assignment error with definite assertion (!)

    @Column()
    matchId!: string;

    @Column()
    winnerId!: string;

    @Column()
    loserId!: string;

    @Column("simple-json")
    finalBoard!: (string | null)[];

    @CreateDateColumn()
    completedAt!: Date;
}
