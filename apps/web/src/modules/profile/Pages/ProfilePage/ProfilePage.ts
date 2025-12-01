import Component from '../../../../core/Component';
import { appState } from '../../../../state';
import type { User } from '../../../../models';
import navBar from '../../components/navBar';
import { profileCard, ProfileSections, sideBar } from '../../components';

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
    const profilecard  = new profileCard({}) ;     
    const profilesections =  new ProfileSections({}); 
    sidebar.mount("#left") ; 
    navbar.mount("#navBar")  ;        
    profilecard.mount("#right");     
    profilesections.mount("#right") ;  
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
        <div   id='left'>  
       </div>    
       <div id='right' >    
        <div id='navBar' >  
        </div>   
      <div>
        </div> 
    `;
  }
}
