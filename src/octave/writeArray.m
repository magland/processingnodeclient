function writeArray(fname,X)

num_dims=2;
if (size(X,3)>1) num_dims=3; end;
if (size(X,4)>1) num_dims=4; end;
if (size(X,5)>1) num_dims=5; end;
if (size(X,6)>1) num_dims=6; end;
FF=fopen(fname,'wb','ieee-le');
complex=1;
if (isreal(X)) complex=0; end;
if (complex)
    fwrite(FF,-1,'int32');
    fwrite(FF,8,'int32');
    fwrite(FF,num_dims,'int32');
    dimprod=1;
    for dd=1:num_dims
        fwrite(FF,size(X,dd),'int32');
        dimprod=dimprod*size(X,dd);
    end;
    XS=reshape(X,dimprod,1);
    Y=zeros(dimprod*2,1);
    Y(1:2:dimprod*2-1)=real(XS);
    Y(2:2:dimprod*2)=imag(XS);
    fwrite(FF,Y,'float32');
else
	V0=X(:);
	maxfrac=max(abs(V0-floor(V0)));
	if (maxfrac==0) 
		minval=min(V0);
		maxval=max(V0);
		%integer type
		if ((0<=minval)&&(maxval<=255))
			dtype='uint8';
			dcode=-2;
		else if ((-32768<minval)&&(maxval<32768))
			dtype='int16';
			dcode=-4;
		else 
			dtype='int32';
			dcode=-5;
		end
		end
	else
		dtype='float32';
		dcode=-3;
	end;
  fwrite(FF,dcode,'int32');
  fwrite(FF,4,'int32');
	fwrite(FF,num_dims,'int32');
	dimprod=1;
  for dd=1:num_dims
      fwrite(FF,size(X,dd),'int32');
      dimprod=dimprod*size(X,dd);
  end;
  Y=reshape(X,dimprod,1);
  fwrite(FF,Y,dtype);
end;
fclose(FF);

end
