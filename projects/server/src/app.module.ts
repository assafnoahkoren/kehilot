import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ExampleModule } from './example/example.module';
import { SubjectModule } from './subject/subject.module';
import { GroupModule } from './group/group.module';
import { NotesModule } from './notes/notes.module';
import { IssueModule } from './issue/issue.module';
import { UserModule } from './user/user.module';

@Module({
	imports: [
		AuthModule,
		ExampleModule,
		SubjectModule,
		GroupModule,
		NotesModule,
		IssueModule,
		UserModule
	],
	controllers: [],
	providers: []
})
export class AppModule {}
