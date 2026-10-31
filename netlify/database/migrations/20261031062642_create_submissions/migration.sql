CREATE TABLE "submissions" (
	"id" serial PRIMARY KEY,
	"student_name" text NOT NULL,
	"student_number" text NOT NULL,
	"access_code" text NOT NULL,
	"answers" jsonb NOT NULL,
	"score" integer NOT NULL,
	"total" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
