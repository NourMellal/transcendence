import Component from '../../../../core/Component';
import { appState } from '../../../../state';
import type { User } from '../../../../models';
import navBar from '../../components/navBar';
import { sideBar } from '../../components';

type State = {
  user: User | null;
};

export default class ProfilePage extends Component<Record<string, never>, State> {
  private unsubscribe?: () => void;

  getInitialState(): State {
    return {
      user: appState.auth.get().user,
    };
  }

  onMount(): void {      

    const navbar  = new navBar({}) ;    
    const sidebar  = new sideBar({}) ;   

    sidebar.mount("#sideBar") ; 
    navbar.mount("#navBar")  ;        
    this.unsubscribe = appState.auth.subscribe((auth) => {
      this.setState({ user: auth.user });
    });
  }

  onUnmount(): void {
    this.unsubscribe?.();  
  }
  protected attachEventListeners(): void {
    
  }
  render(): string {  
   
    return `   
        <div class='profileContainer flex'>      
        <div id='sideBar' >  

        </div> 
         <div   id='navBar'>  
        </div>  
        </div> 
    `;
  }
}
