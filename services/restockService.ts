import { gql } from "graphql-request";


export class RestockService {

    static async scheduleRestock(
        startDate: Date,
        endDate: Date | null | undefined,
        time: string,
        recurrence: string,
        email: string,
        subject?: string,
    ) {
        const CREATE_SCHEDULE = gql`
        mutation CreateSchedule($data: RestockScheduleInput!) {
        createRestockSchedule(data: $data) {
            id
         }
        }
        `;
    }
}