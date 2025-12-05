import { ComplainState } from 'src/common/constants/complains-state.enum';

export interface ComplainsInterface {
  id: string;
  type: string;
  writer: string;
  state: ComplainState;
  text: string;
  replyEmail: string;
  createdAt: string;
}
