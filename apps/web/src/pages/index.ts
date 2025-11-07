import { BaseComponent } from "../components";  
import {ExamplComponent} from "../components"
import  {h} from "../components"   

export interface  WelcomeComponentProps { 
      message? : string  ;   
      onClick?:()=> void ;   
      disabled?: boolean ;    
}   

export class welcomePageComponent extends BaseComponent<WelcomeComponentProps> {
    constructor(props: WelcomeComponentProps = {}) {
        super(props);
    }
    

}
