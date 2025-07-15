import { Component, OnInit } from '@angular/core';
import { SitejobLayoutComponent } from '../../../shared/sitejob-layout/sitejob-layout.component';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { CommonModule } from '@angular/common';
import { MATERIAL_MODULES } from '../../../material';
import { SitejobSidenavbarComponent } from '../../../shared/sitejob-sidenavbar/sitejob-sidenavbar.component';
import { SitejobTabsComponent } from '../../../shared/sitejob-tabs/sitejob-tabs.component';
import { TicketStatusService } from '../../../core/services/route/ticketstatus.service';
import { PeopleService } from '../../../core/services/human-resources/users.service';
import { CrewsService } from '../../../core/services/human-resources/crew.service';
import { CrewEmployeesService } from '../../../core/services/human-resources/crewemployees.service';
import { SkillsService } from '../../../core/services/human-resources/skills.service';

@Component({
  selector: 'app-completed',
  imports: [SitejobLayoutComponent,
    SitejobSidenavbarComponent,
    SitejobTabsComponent,
    MatTableModule,
    MatDividerModule,
    CommonModule,
    MATERIAL_MODULES],
  templateUrl: './completed.component.html',
  styleUrl: './completed.component.scss'
})
export class CompletedComponent implements OnInit {
  previousLocations: any[] = [];
  employeeList: any[] = [];
  teamLeader: string = '';
  teamMembers: string[] = [];
  crewId: number = 0;
  crewType: string = '';
  userId: number = 0;

  constructor(
    private ticketStatusService: TicketStatusService,
    private usersService: PeopleService,
    private crewEmployeesService: CrewEmployeesService,
    private crewsService: CrewsService,
    private skillsService: SkillsService
  ) {}

  ngOnInit(): void {
    this.loadEmployees(); // 👈 primero carga empleados
  }

 loadEmployees() {
  import('rxjs').then(({ forkJoin }) => {
    forkJoin({
      people: this.usersService.getAllPeople(),
      crewEmployees: this.crewEmployeesService.getAllCrewEmployees(),
      crews: this.crewsService.getAllCrews(),
      skills: this.skillsService.getAllSkills()
    }).subscribe({
      next: ({ people, crewEmployees, crews, skills }) => {
        // 🔁 Mapeo de todos los empleados
        this.employeeList = people.map((person: any) => {
          const crewAssignment = crewEmployees.find((ce: any) => ce.employeeid === person.employeeId); // <-- corregido
          const assignedCrew = crewAssignment
            ? crews.find((c: any) => c.crewid === crewAssignment.crewid)
            : null;
          const personSkills = skills
            .filter((s: any) => s.userId === person.userId) // <-- corregido
            .map((s: any) => s.name);

          return {
            employeeid: person.employeeId,  // <-- corregido
            userid: person.userId,          // <-- corregido
            name: `${person.firstname} ${person.lastname}`,
            crewid: crewAssignment?.crewid || null,
            type: assignedCrew?.type || '',
            workedhours: assignedCrew?.workedhours || 0,
            skills: personSkills,
            crewLeader: crewAssignment?.crewleader ?? false
          };
        });

        // 🔍 Buscar usuario logueado
        const storedUserId = Number(localStorage.getItem('userId'));
        const person = this.employeeList.find(p => p.userid === storedUserId);

        if (!person) {
          console.warn('⚠️ Usuario logueado no encontrado entre empleados.');
          return;
        }

        this.userId = person.userid;

        const currentCrewId = person.crewid;
        if (!currentCrewId) {
          console.warn('⚠️ El usuario no tiene crew asignado.');
          return;
        }

        // ✅ Establecer crewId y tipo
        this.crewId = currentCrewId;

        const assignedCrew = crews.find((c: any) => c.crewid === currentCrewId);
        this.crewType = assignedCrew?.type || 'N/A';

        // 👥 Obtener miembros del equipo
        const teamMembers = this.employeeList.filter(e => e.crewid === currentCrewId);
        const leader = teamMembers.find(e => e.crewLeader);
        const members = teamMembers.filter(e => !e.crewLeader).map(e => e.name);

        this.teamLeader = leader?.name || 'N/A';
        this.teamMembers = members;

        console.log('✅ Team Leader:', this.teamLeader);
        console.log('👥 Team Members:', this.teamMembers);
        console.log('👷 crewId detectado:', this.crewId);

        // ⏬ Cargar tickets del crew
        this.loadCompletedTickets(this.crewId);
      },
      error: (err) => console.error('❌ Error loading employee data:', err)
    });
  });
}


  loadCompletedTickets(crewId: number): void {
    this.ticketStatusService.getCompletedTickets().subscribe({
      next: (data) => {
        this.previousLocations = data
          .filter(ticket => ticket.crewid === crewId)
          .map(ticket => ({
            address: `${ticket.fromaddressstreet} ${ticket.toaddressstreet} ${ticket.fromaddresscardinal ?? ''} ${ticket.fromaddresssuffix ?? ''}`,
            actions: ['Completed work'], // Aquí podrías mapear fases reales
            imageUrl: '/assets/imgs/completed1.JPG', // Aquí puedes incluir URL real si la tienes
            comment: `Surface: ${ticket.surfacetotal} m²`,
            startingDate: ticket.startingdate,
            endingDate: ticket.endingdate
          }));
      },
      error: (err) => {
        console.error('❌ Error loading completed tickets:', err);
      }
    });
  }
}